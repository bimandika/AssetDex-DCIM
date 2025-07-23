import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { action, type, value } = await req.json()
    
    // Handle get-enums action
    if (action === 'get-enums') {
      try {
        // Fetch all enum types and their values
        const { data: enums, error } = await supabase.rpc('get_all_enums')
        
        if (error) throw error
        
        return new Response(JSON.stringify(enums), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (err) {
        return errorResponse('Failed to fetch enums: ' + (err as Error).message, 500)
      }
    }
    
    // For other actions, require type and value
    if (!type || !value) {
      return errorResponse('Missing type or value for this action')
    }
    
    // Only allow safe enum types (hardcoded for security)
    const allowedTypes = [
      'brand_type', 'model_type', 'os_type', 'site_type', 'building_type',
      'rack_type', 'unit_type', 'allocation_type', 'environment_type', 'server_status', 'device_type'
    ]
    
    if (!allowedTypes.includes(type)) {
      return errorResponse('Invalid enum type')
    }

    // Only allow add (removal is dangerous and not supported by Postgres natively)
    if (action === 'add') {
      // ALTER TYPE ... ADD VALUE IF NOT EXISTS ...
      const sql = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '${value}' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${type}')) THEN ALTER TYPE public.${type} ADD VALUE '${value}'; END IF; END $$;`;
      const { error } = await supabase.rpc('execute_sql', { sql })
      if (error) {
        return errorResponse('Failed to add enum value: ' + error.message, 500)
      }
      return new Response(JSON.stringify({ success: true, message: `Added value '${value}' to enum '${type}'` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'remove') {
      // Not supported safely, return error
      return errorResponse('Removing enum values is not supported. This can break existing data.')
    } else {
      return errorResponse('Invalid action')
    }
  } catch (err: any) {
    return errorResponse(err.message || 'Internal server error', 500)
  }
}
