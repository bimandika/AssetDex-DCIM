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

    // Debug log request headers and body
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    const { action, type, value } = requestBody;
    
    // Handle get-enums action
    if (action === 'get-enums') {
      try {
        // Fetch all enum types and their values
        const { data: enums, error } = await supabase.rpc('get_enum_values')
        
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

    // Only allow add (removal is dangerous and not supported by Postgres natively)
    if (action === 'add') {
      // Sanitize type and value
      const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, '');
      const safeValue = String(value).replace(/'/g, "''");
      // ALTER TYPE ... ADD VALUE IF NOT EXISTS ...
      const sql = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '${safeValue}' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${safeType}')) THEN ALTER TYPE public.${safeType} ADD VALUE '${safeValue}'; END IF; END $$;`;
      const { error } = await supabase.rpc('execute_sql', { sql })
      if (error) {
        return errorResponse('Failed to add enum value: ' + error.message, 500)
      }
      return new Response(JSON.stringify({ success: true, message: `Added value '${safeValue}' to enum '${safeType}'` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (action === 'remove') {
      // Not supported safely, return error
      return errorResponse('Removing enum values is not supported. This can break existing data.')
    } else if (action === 'create') {
      if (!type || !Array.isArray(value) || value.length === 0) {
        return errorResponse('Missing type or values for enum creation');
      }
      // Sanitize type and values
      const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, '');
      const safeValues = value.map((v: string) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      // 1. Create the enum type
      const createTypeSql = `CREATE TYPE public.${safeType} AS ENUM (${safeValues});`;
      const { error: createTypeError } = await supabase.rpc('execute_sql', { sql: createTypeSql });
      if (createTypeError && !createTypeError.message.includes('already exists')) {
        return errorResponse('Failed to create enum type: ' + createTypeError.message, 500);
      }
      // 2. Add the column to the servers table
      const addColumnSql = `ALTER TABLE servers ADD COLUMN IF NOT EXISTS ${safeType} public.${safeType};`;
      const { error: addColumnError } = await supabase.rpc('execute_sql', { sql: addColumnSql });
      if (addColumnError && !addColumnError.message.includes('already exists')) {
        return errorResponse('Failed to add column: ' + addColumnError.message, 500);
      }
      return new Response(JSON.stringify({ success: true, name: safeType, values: value }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return errorResponse('Invalid action')
    }
  } catch (err: any) {
    return errorResponse(err.message || 'Internal server error', 500)
  }
}
