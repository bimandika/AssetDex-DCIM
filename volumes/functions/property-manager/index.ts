import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
}

interface ServerProperty {
  id?: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  description?: string;
  required?: boolean;
  default_value?: string;
  options?: string[];
  category?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// Helper function to map database types to property types
const mapDbTypeToPropertyType = (dbType: unknown): string => {
  // If dbType is not a string, return 'text' as default
  if (typeof dbType !== 'string') {
    console.warn(`Expected string for dbType, got ${typeof dbType}:`, dbType);
    return 'text';
  }
  
  const typeMap: Record<string, string> = {
    'integer': 'number',
    'bigint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'timestamp': 'date',
    'timestamp with time zone': 'date',
    'character varying': 'text',
    'text': 'text',
    'jsonb': 'json',
    'json': 'json',
    'uuid': 'text'
  };
  
  return typeMap[dbType.toLowerCase()] || 'text';
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Authorization check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (req.method === 'GET') {
      try {
        console.log('Returning hardcoded property list...');
        
        // Hardcoded response for testing
        const hardcodedResponse = [
          {
            key: 'hostname',
            name: 'Hostname',
            type: 'text',
            required: true,
            default_value: '',
            visible: true
          },
          {
            key: 'brand',
            name: 'Brand',
            type: 'text',
            required: true,
            default_value: '',
            visible: true
          },
          {
            key: 'model',
            name: 'Model',
            type: 'text',
            required: false,
            default_value: '',
            visible: true
          },
          {
            key: 'serial_number',
            name: 'Serial Number',
            type: 'text',
            required: false,
            default_value: '',
            visible: true
          },
          {
            key: 'status',
            name: 'Status',
            type: 'select',
            required: true,
            default_value: 'in_storage',
            options: ['in_use', 'in_maintenance', 'decommissioned', 'in_storage'],
            visible: true
          },
          {
            key: 'dc_building',
            name: 'Data Center Building',
            type: 'text',
            required: true,
            default_value: '',
            visible: true
          },
          {
            key: 'allocation',
            name: 'Allocation',
            type: 'text',
            required: true,
            default_value: '',
            visible: true
          }
        ];
        
        return new Response(JSON.stringify(hardcodedResponse), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
        
      } catch (err) {
        console.error('Error in GET handler:', err);
        return new Response(
          JSON.stringify({ 
            error: 'Internal server error', 
            details: err instanceof Error ? err.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'POST') {
      // Add a new column to the servers table
      const body: ServerProperty = await req.json();
      
      // Validate required fields
      if (!body.key || !body.type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: key and type are required' }), 
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate column name (key)
      const columnName = body.key.trim().toLowerCase();
      if (!/^[a-z_][a-z0-9_]*$/.test(columnName)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid column name. Must start with a letter or underscore and contain only lowercase letters, numbers, and underscores.'
          }), 
          { status: 400, headers: corsHeaders }
        );
      }

      // Check for reserved SQL keywords
      const reservedKeywords = ['select', 'insert', 'update', 'delete', 'where', 'from', 'table', 'column', 'alter', 'create'];
      if (reservedKeywords.includes(columnName)) {
        return new Response(
          JSON.stringify({ 
            error: `Column name cannot be a reserved SQL keyword: ${columnName}`
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate property type
      const allowedTypes = ['text', 'number', 'boolean', 'date', 'select'];
      if (!allowedTypes.includes(body.type)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid column type. Must be one of: ${allowedTypes.join(', ')}`
          }), 
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Check if column already exists
      const { data: columnExists } = await supabaseAdmin.rpc('column_exists', {
        table_name: 'servers',
        column_name: columnName
      });
      
      if (columnExists) {
        return new Response(
          JSON.stringify({
            error: `Column '${columnName}' already exists in the servers table`
          }),
          { status: 409, headers: corsHeaders } // 409 Conflict
        );
      }

      // Map property type to SQL type
      let sqlType = 'TEXT';
      if (body.type === 'number') sqlType = 'NUMERIC';
      if (body.type === 'boolean') sqlType = 'BOOLEAN';
      if (body.type === 'date') sqlType = 'DATE';
      
      // Add column to servers table with transaction for safety
      const alterRes = await supabaseAdmin.rpc('execute_sql', {
        sql: `
          BEGIN;
          ALTER TABLE public.servers ADD COLUMN "${columnName}" ${sqlType};
          
          -- Add column comment for better documentation
          COMMENT ON COLUMN public.servers."${columnName}" IS 
            '${String(body.description || body.name).replace(/'/g, "''")}';
            
          COMMIT;
        `
      });

      if (alterRes.error) {
        return new Response(
          JSON.stringify({ 
            error: `Failed to add column to servers table: ${alterRes.error.message}` 
          }), 
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully added column '${columnName}' to servers table`,
          column: columnName,
          type: body.type
        }), 
        { headers: corsHeaders }
      );
    }

    if (req.method === 'DELETE') {
      // Remove a column from the servers table
      const { key } = await req.json();
      
      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: key' }), 
          { status: 400, headers: corsHeaders }
        );
      }

      // Prevent deletion of core columns
      const protectedColumns = [
        // System columns
        'id', 'created_at', 'updated_at', 'created_by',
        // Server identification
        'hostname', 'device_type', 'ip_address', 'serial_number', 'brand', 'model', 'status',
        // DC organization
        'dc_site', 'dc_building', 'dc_floor', 'dc_room',
        // Classification
        'allocation', 'environment'
      ];
      if (protectedColumns.includes(key)) {
        return new Response(
          JSON.stringify({ error: `Cannot delete protected column: ${key}` }), 
          { status: 403, headers: corsHeaders }
        );
      }

      // Remove column from servers table
      const alterRes = await supabaseAdmin.rpc('execute_sql', {
        sql: `ALTER TABLE public.servers DROP COLUMN IF EXISTS "${key}";`
      });

      if (alterRes.error) {
        return new Response(
          JSON.stringify({ 
            error: `Failed to remove column from servers table: ${alterRes.error.message}` 
          }), 
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully removed column '${key}' from servers table`
        }), 
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in property manager function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
}
