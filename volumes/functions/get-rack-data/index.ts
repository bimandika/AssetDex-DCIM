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
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// This is the main handler function that will be called by the main function
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const { rackName } = await req.json()

    if (!rackName) {
      throw new Error('rackName is required')
    }

    // Get servers in the specified rack with all details
    const { data: servers, error: serversError } = await supabaseClient
      .from('servers')
      .select(`
        id,
        hostname,
        serial_number,
        brand,
        model,
        status,
        ip_address,
        ip_oob,
        unit,
        unit_height,
        rack,
        device_type,
        allocation,
        environment
      `)
      .eq('rack', rackName)
      .order('unit', { ascending: false }) // U42 to U1

    if (serversError) throw serversError

    // Get rack metadata if available
    const { data: rackMeta } = await supabaseClient
      .from('rack_metadata')
      .select('*')
      .eq('rack_name', rackName)
      .single()

    // Transform data to rack structure
    const rackData = {
      name: rackName,
      datacenter_id: rackMeta?.datacenter_id || 'DC-East',
      floor: rackMeta?.floor || 1,
      location: rackMeta?.location || 'Unknown',
      total_units: 42,
      servers: servers || []
    }

    return new Response(JSON.stringify({ data: rackData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-rack-data function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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
