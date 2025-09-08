import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

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
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS'
}

// This is the main handler function for updating rack descriptions
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Allow both POST (for Supabase Edge Function calls) and PUT (for direct API calls)
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return new Response('Method not allowed', { 
      headers: corsHeaders, 
      status: 405 
    })
  }

  try {
    // Create a Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Extract rack ID from URL path or request body
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    let rackId = pathParts[pathParts.length - 2] // For REST API calls like /api/racks/{rackId}/description

    // Parse request body
    const requestBody = await req.json()
    const { 
      rack_name, 
      description, 
      dc_site, 
      dc_building, 
      dc_floor, 
      dc_room, 
      total_units,
      power_capacity_kva,
      power_factor,
      power_config_preset
    } = requestBody

    // For Supabase Edge Function calls, use rack_name from body
    if (!rackId || rackId === 'update-rack-description') {
      rackId = rack_name
    }

    if (!rackId) {
      throw new Error('Rack ID or rack_name is required')
    }

    if (description && description.length > 40) {
      throw new Error('Description cannot exceed 40 characters')
    }

    // Check if rack exists in rack_metadata table
    const { data: existingRack, error: fetchError } = await supabaseClient
      .from('rack_metadata')
      .select('rack_name')
      .eq('rack_name', rackId)
      .single()

    if (fetchError && fetchError.code === 'PGRST116') {
      // Rack doesn't exist, create a new row with all provided metadata
      const { data: insertData, error: insertError } = await supabaseClient
        .from('rack_metadata')
        .insert({
          rack_name: rackId,
          dc_site: dc_site || 'DC-East', // Use provided or default value
          dc_building: dc_building || 'Building-A',
          dc_floor: dc_floor || '1',
          dc_room: dc_room || 'MDF',
          description: description || '',
          total_units: total_units || 42,
          power_capacity_kva: power_capacity_kva || 4.2,
          power_factor: power_factor || 0.8,
          power_config_preset: power_config_preset || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Rack metadata created successfully',
        data: insertData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    } else if (fetchError) {
      throw fetchError
    }

    // Rack exists, update the fields (only update provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (description !== undefined) updateData.description = description
    if (dc_site !== undefined) updateData.dc_site = dc_site
    if (dc_building !== undefined) updateData.dc_building = dc_building
    if (dc_floor !== undefined) updateData.dc_floor = dc_floor
    if (dc_room !== undefined) updateData.dc_room = dc_room
    if (total_units !== undefined) updateData.total_units = total_units
    if (power_capacity_kva !== undefined) updateData.power_capacity_kva = power_capacity_kva
    if (power_factor !== undefined) updateData.power_factor = power_factor
    if (power_config_preset !== undefined) updateData.power_config_preset = power_config_preset

    const { data: updatedData, error: updateError } = await supabaseClient
      .from('rack_metadata')
      .update(updateData)
      .eq('rack_name', rackId)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Rack metadata updated successfully',
      data: updatedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in update-rack-description function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}

// For local testing with: deno run --allow-net --allow-env index.ts
if (typeof Deno.serve === 'function') {
  Deno.serve(handler);
}
