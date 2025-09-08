// Power Usage API Handler for AssetDex-DCIM
// Enhanced to handle all hierarchical power summary endpoints

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Deno environment type declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?: (handler: (req: Request) => Promise<Response> | Response) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

interface RoomSummary {
  room: string;
  racks: any[];
  total_capacity: number;
  total_usage: number;
}

// This is the main handler function that will be called by the main router
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url)
    const dc = searchParams.get('dc')
    const floor = searchParams.get('floor')
    const room = searchParams.get('room')
    const rack = searchParams.get('rack')

    // 1. Single Rack Summary
    if (rack) {
      const { data, error } = await supabase.rpc('get_rack_power_summary', {
        rack_name_param: rack
      })
      if (error) throw error
      return new Response(JSON.stringify(data?.[0] || {}), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Room-level Summary (all racks in room)
    if (dc && floor && room) {
      const { data, error } = await supabase.rpc('get_room_power_summary', {
        dc_site_param: dc,
        dc_floor_param: parseInt(floor),
        dc_room_param: room
      })
      if (error) {
        console.error('Room power summary error:', error)
        throw error
      }
      return new Response(JSON.stringify(data || []), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 3. Floor-level Summary (aggregates rooms in floor)
    if (dc && floor) {
      const { data, error } = await supabase.rpc('get_floor_power_summary', {
        dc_site_param: dc,
        dc_floor_param: parseInt(floor)
      })
      if (error) {
        console.error('Floor power summary error:', error)
        throw error
      }
      return new Response(JSON.stringify(data || []), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 4. DC-level Summary (will be enhanced later)
    if (dc) {
      const { data, error } = await supabase.rpc('get_global_power_summary')
      if (error) throw error
      return new Response(JSON.stringify({ 
        dc_site: dc, 
        ...data?.[0] 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 5. Global Summary (default)
    const { data, error } = await supabase.rpc('get_global_power_summary')
    if (error) throw error
    
    return new Response(JSON.stringify(data?.[0] || {}), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Power usage API error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

// For local testing with: deno run --allow-net --allow-env index.ts  
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
}