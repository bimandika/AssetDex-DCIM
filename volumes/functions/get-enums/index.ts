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
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

type EnumResponse = {
  status: string[];
  deviceTypes: string[];
  allocationTypes: string[];
  environmentTypes: string[];
  brands: string[];
  models: string[];
  osTypes: string[];
  sites: string[];
  buildings: string[];
  racks: string[];
  units: string[];
};

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

    // Call the database function to get enum values
    const { data, error } = await supabaseClient.rpc('get_enum_values')
    
    if (error) {
      console.error('Error fetching enum values:', error)
      throw new Error('Failed to fetch enum values from database')
    }

    // Type assertion for the response
    const response = data as unknown as EnumResponse

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-enums function:', error)
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
