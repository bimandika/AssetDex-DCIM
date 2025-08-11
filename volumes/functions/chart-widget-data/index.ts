import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

// Chart widget breakdown handler
export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables', { supabaseUrl, supabaseKey });
      throw new Error('Missing required environment variables');
    }
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Accept POST with breakdown config and filters
    if (req.method === 'POST') {
      const body = await req.json();
      const allowedFields = ['brand', 'model', 'status', 'dc_site', 'building', 'floor', 'room', 'rack', 'allocation', 'device_type', 'environment', 'operating_system'];
      let groupFields = body.groupFields || ['brand', 'model', 'status'];
      // Accept filters as array or object
      let filtersRaw = body.filters || [];
      let filters: Array<{ field: string, value: any, operator?: string }> = [];
      if (Array.isArray(filtersRaw)) {
        filters = filtersRaw;
      } else if (filtersRaw && typeof filtersRaw === 'object') {
        // Convert object to array of { field, value }
        filters = Object.entries(filtersRaw)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([field, value]) => ({ field, value, operator: 'equals' }));
      }

      // Validate groupFields
      if (!Array.isArray(groupFields) || groupFields.length === 0) {
        groupFields = ['brand', 'model', 'status'];
      }
      const invalidFields = groupFields.filter(f => !allowedFields.includes(f));
      if (invalidFields.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid groupFields: ${invalidFields.join(', ')}. Allowed: ${allowedFields.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Compose select string for view
      const selectFields = groupFields.concat(['count']).join(',');
      let query = supabaseClient.from('server_grouped_counts').select(selectFields);
      // Apply filters (only those matching groupFields)
      for (const filter of filters) {
        if (!filter.field) continue;
        // Only apply filters for fields present in groupFields
        if (!groupFields.includes(filter.field)) continue;
        const operator = filter.operator || 'equals';
        switch (operator) {
          case 'equals':
            if (Array.isArray(filter.value)) {
              query = query.in(filter.field, filter.value);
            } else {
              query = query.eq(filter.field, filter.value);
            }
            break;
          case 'contains':
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
          case 'in':
            query = query.in(filter.field, Array.isArray(filter.value) ? filter.value : [filter.value]);
            break;
          default:
            break;
        }
      }
      const { data, error } = await query;
      if (error) {
        console.error('Supabase query error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message || 'Supabase query error', details: error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Merge rows by groupFields
      function mergeRows(rows: any[], groupFields: string[]) {
        const merged: Record<string, any> = {};
        for (const row of rows) {
          // Create a key based on groupFields values
          const key = groupFields.map(f => row[f]).join('|');
          if (!merged[key]) {
            merged[key] = { ...row };
          } else {
            merged[key].count += row.count;
          }
        }
        return Object.values(merged);
      }

      const mergedData = mergeRows(data, groupFields);

      return new Response(
        JSON.stringify({ success: true, data: mergedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid method' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error', details: error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

serve(handler);