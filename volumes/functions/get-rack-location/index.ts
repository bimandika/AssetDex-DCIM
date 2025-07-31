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

    // Hardcoded rack locations based on database schema for now
    const rackLocations: Record<string, any> = {
      'RACK-01': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '1', dc_room: 'MDF' },
      'RACK-02': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '2', dc_room: '201' },
      'RACK-03': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '3', dc_room: '301' }
    }

    const location = rackLocations[rackName] || rackLocations['RACK-01']

    return new Response(
      JSON.stringify({ location }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}

// This is required to support the function in the Edge Function environment
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(handler)
}
