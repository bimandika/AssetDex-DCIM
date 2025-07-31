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

    const { level, filters } = await req.json()

    let query = supabaseClient
      .from('servers')
      .select('dc_site, dc_building, dc_floor, dc_room, rack')

    // Apply filters based on level
    if (filters?.dc_site) {
      query = query.eq('dc_site', filters.dc_site)
    }
    if (filters?.dc_building) {
      query = query.eq('dc_building', filters.dc_building)
    }
    if (filters?.dc_floor) {
      query = query.eq('dc_floor', filters.dc_floor)
    }
    if (filters?.dc_room) {
      query = query.eq('dc_room', filters.dc_room)
    }

    const { data: servers, error } = await query

    if (error) {
      throw error
    }

    let result: string[] = []

    switch (level) {
      case 'sites':
        result = [...new Set(servers?.map(s => s.dc_site).filter(Boolean))]
        break
      case 'buildings':
        result = [...new Set(servers?.map(s => s.dc_building).filter(Boolean))]
        break
      case 'floors':
        result = [...new Set(servers?.map(s => s.dc_floor).filter(Boolean))]
        break
      case 'rooms':
        result = [...new Set(servers?.map(s => s.dc_room).filter(Boolean))]
        break
      case 'racks':
        result = [...new Set(servers?.map(s => s.rack).filter(Boolean))]
        break
      default:
        throw new Error('Invalid level specified')
    }

    return new Response(
      JSON.stringify({ data: result.sort() }),
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
