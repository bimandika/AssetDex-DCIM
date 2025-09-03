import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckAvailabilityRequest {
  rack: string;
  position: number;
  unitHeight: number;
  excludeServerId?: string; // For edit operations
}

interface ServerInRack {
  id: string;
  hostname: string;
  unit: number;
  unit_height: number;
}

interface AvailabilityResponse {
  available: boolean;
  conflictingServers?: ServerInRack[];
  availableSpaces?: Array<{
    startUnit: number;
    endUnit: number;
    size: number;
  }>;
  suggestion?: {
    position: number;
    reason: string;
  };
}

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { rack, position, unitHeight, excludeServerId }: CheckAvailabilityRequest = await req.json()

    console.log(`🔍 Checking availability for rack ${rack}, position ${position}, height ${unitHeight}U`)

    // Get all servers in the specified rack
    let query = supabaseClient
      .from('servers')
      .select('id, hostname, unit, unit_height')
      .eq('rack', rack)
      .not('unit', 'is', null)
      .not('unit_height', 'is', null)

    // Exclude current server if editing
    if (excludeServerId) {
      query = query.neq('id', excludeServerId)
      console.log(`📝 Excluding server ${excludeServerId} from conflict check`)
    }

    const { data: existingServers, error } = await query

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log(`📊 Found ${existingServers?.length || 0} existing servers in rack ${rack}`)

    // Convert unit positions from string format (U42) to numbers
    const servers: ServerInRack[] = (existingServers || []).map(server => ({
      id: server.id,
      hostname: server.hostname,
      unit: typeof server.unit === 'string' ? parseInt(server.unit.replace('U', '')) : server.unit,
      unit_height: server.unit_height
    }))

    // Check for conflicts with requested position
    const requestedUnits = new Set<number>()
    for (let i = 0; i < unitHeight; i++) {
      requestedUnits.add(position + i)
    }

    console.log(`🎯 Requested units: ${Array.from(requestedUnits).sort((a, b) => a - b).join(', ')}`)

    // Find conflicting servers
    const conflictingServers: ServerInRack[] = []
    servers.forEach(server => {
      const serverUnits = new Set<number>()
      for (let i = 0; i < server.unit_height; i++) {
        serverUnits.add(server.unit + i)
      }
      
      // Check for overlap
      const hasOverlap = Array.from(requestedUnits).some(unit => serverUnits.has(unit))
      if (hasOverlap) {
        conflictingServers.push(server)
        console.log(`⚠️  Conflict with ${server.hostname} at U${server.unit} (${server.unit_height}U)`)
      }
    })

    // Calculate available spaces in the rack
    const occupiedUnits = new Set<number>()
    servers.forEach(server => {
      for (let i = 0; i < server.unit_height; i++) {
        occupiedUnits.add(server.unit + i)
      }
    })

    // Find available spaces
    const availableSpaces: Array<{ startUnit: number; endUnit: number; size: number }> = []
    let currentSpaceStart: number | null = null

    for (let unit = 42; unit >= 1; unit--) {
      if (!occupiedUnits.has(unit)) {
        // Unit is free
        if (currentSpaceStart === null) {
          currentSpaceStart = unit
        }
      } else {
        // Unit is occupied, close current space if any
        if (currentSpaceStart !== null) {
          const spaceSize = currentSpaceStart - unit
          availableSpaces.push({
            startUnit: currentSpaceStart,
            endUnit: unit + 1,
            size: spaceSize
          })
          currentSpaceStart = null
        }
      }
    }

    // Close final space if rack ends with available units
    if (currentSpaceStart !== null) {
      const spaceSize = currentSpaceStart - 0
      availableSpaces.push({
        startUnit: currentSpaceStart,
        endUnit: 1,
        size: spaceSize
      })
    }

    console.log(`📍 Available spaces: ${availableSpaces.map(s => `U${s.startUnit}-U${s.endUnit} (${s.size}U)`).join(', ')}`)

    // Find best suggestion if requested position is not available
    let suggestion: { position: number; reason: string } | undefined

    if (conflictingServers.length > 0) {
      // Find the best available space that can fit the server
      const suitableSpaces = availableSpaces.filter(space => space.size >= unitHeight)
      
      if (suitableSpaces.length > 0) {
        // Prefer spaces at the top of the rack
        const bestSpace = suitableSpaces[0]
        suggestion = {
          position: bestSpace.startUnit,
          reason: `Suggested position U${bestSpace.startUnit} in available ${bestSpace.size}U space (U${bestSpace.startUnit}-U${bestSpace.endUnit})`
        }
      }
    }

    const response: AvailabilityResponse = {
      available: conflictingServers.length === 0,
      conflictingServers: conflictingServers.length > 0 ? conflictingServers : undefined,
      availableSpaces,
      suggestion
    }

    console.log(`✅ Availability check complete: ${response.available ? 'Available' : 'Conflicts found'}`)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error in check-rack-availability:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        available: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}
