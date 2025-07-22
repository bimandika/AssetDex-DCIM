import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
}

// Define the property type
type PropertyType = 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';

interface PropertyDefinition {
  name: string;
  key: string;
  type: PropertyType;
  description?: string;
  required?: boolean;
  default_value?: string | number | boolean | null;
  options?: string[];
  category?: string;
  sort_order?: number;
}

// Core properties that cannot be deleted
const CORE_PROPERTIES = new Set([
  'hostname', 'ip_address', 'ip_oob', 'serial_number', 'brand', 'model',
  'operating_system', 'dc_site', 'dc_building', 'dc_floor', 'dc_room',
  'allocation', 'environment', 'status', 'notes', 'rack', 'unit'
]);

// Helper function to handle CORS preflight requests
const handleOptions = (request: Request): Response => {
  if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {
    return new Response(null, { headers: corsHeaders });
  } else {
    return new Response(null, { headers: { Allow: 'GET, POST, PATCH, DELETE, OPTIONS' } });
  }
};

// Main handler function
const propertyManagerHandler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions(req);
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Unauthorized:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;

    // Handle GET request - list all properties
    if (req.method === 'GET') {
      const { data: properties, error } = await supabaseAdmin
        .from('property_definitions')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching properties:', error);
        throw new Error('Failed to fetch properties');
      }

      return new Response(
        JSON.stringify({ data: properties }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - add new property
    if (req.method === 'POST') {
      const body: PropertyDefinition = await req.json();
      
      if (!body.name || !body.key || !body.type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: name, key, type' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Map property type to SQL type
      const sqlType = (() => {
        switch (body.type) {
          case 'number': return 'NUMERIC';
          case 'boolean': return 'BOOLEAN';
          case 'date': return 'DATE';
          case 'multiselect': return 'TEXT[]';
          default: return 'TEXT'; // text, select, etc.
        }
      })();

      // Build and execute the SQL to add the column
      const columnName = body.key;
      const description = body.description || body.name;
      
      // First add the column
      const addColumnSql = `
        ALTER TABLE public.servers 
        ADD COLUMN IF NOT EXISTS "${columnName}" ${sqlType};
      `;
      
      const { data: addColumnResult, error: addColumnError } = await supabaseAdmin
        .rpc('execute_sql', { sql: addColumnSql });

      if (addColumnError) {
        console.error('Error adding column:', addColumnError);
        throw new Error(`Failed to add column: ${addColumnError.message}`);
      }

      if (!addColumnResult || !addColumnResult.success) {
        const errorMsg = addColumnResult?.error || 'Unknown error';
        console.error('Failed to add column:', errorMsg);
        throw new Error(`Failed to add column: ${errorMsg}`);
      }
      
      // Add comment if description is provided
      if (description) {
        const commentSql = `
          COMMENT ON COLUMN public.servers."${columnName}" IS ${supabaseAdmin.rpc('$1', [description])};
        `;
        
        const { error: commentError } = await supabaseAdmin
          .rpc('execute_sql', { sql: commentSql });
          
        if (commentError) {
          console.error('Warning: Failed to add column comment:', commentError);
          // Continue even if comment fails
        }
      }

      // Add to property_definitions table
      const { data: property, error: insertError } = await supabaseAdmin
        .from('property_definitions')
        .insert({
          key: body.key,
          name: body.name,
          display_name: body.name, // Using name as display_name if not provided
          property_type: body.type, // Changed from type to property_type to match schema
          description: body.description,
          required: body.required || false,
          default_value: body.default_value,
          options: body.options,
          category: body.category,
          sort_order: body.sort_order || 0,
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding property definition:', insertError);
        throw new Error(`Failed to add property definition: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({ data: property }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE request - remove property
    if (req.method === 'DELETE') {
      const { key } = await req.json();
      
      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: key' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Prevent deletion of core properties
      if (CORE_PROPERTIES.has(key)) {
        return new Response(
          JSON.stringify({ error: `Cannot delete core property: ${key}` }),
          { status: 403, headers: corsHeaders }
        );
      }

      // First delete from property_definitions
      const { error: deleteError } = await supabaseAdmin
        .from('property_definitions')
        .delete()
        .eq('key', key);

      if (deleteError) {
        console.error('Error deleting property definition:', deleteError);
        throw new Error(`Failed to delete property definition: ${deleteError.message}`);
      }

      // Then drop the column from the servers table
      const { data: dropColumnResult, error: dropColumnError } = await supabaseAdmin
        .rpc('drop_server_column', { p_column_name: key });

      if (dropColumnError) {
        console.error('Error dropping column:', dropColumnError);
        throw new Error(`Failed to drop column: ${dropColumnError.message}`);
      }

      if (!dropColumnResult || !dropColumnResult.success) {
        const errorMsg = dropColumnResult?.error || 'Unknown error';
        console.error('Failed to drop column:', errorMsg);
        throw new Error(`Failed to drop column: ${errorMsg}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: `Property '${key}' deleted successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle unsupported methods
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in property manager:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

// Export the handler for Supabase Edge Functions
export const handler = propertyManagerHandler;

export default handler;
