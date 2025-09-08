// Auto Power Assignment API Handler  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',  
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { server_id, device_model, manufacturer } = body

    if (server_id) {
      // Assign power from device glossary for specific server
      const { data, error } = await supabase.rpc('assign_power_from_device_glossary', {
        server_id: server_id
      })

      if (error) {
        console.error('Power assignment error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to assign power from device glossary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          result: data?.[0] || {},
          server_id: server_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Run auto power estimation for all devices without power specs
      const { data, error } = await supabase.rpc('assign_auto_power_estimation')

      if (error) {
        console.error('Auto power estimation error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to run auto power estimation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          result: data?.[0] || {},
          processed_devices: data?.[0]?.devices_processed || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Auto power assignment API error:', error)
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

// For local testing
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
}
