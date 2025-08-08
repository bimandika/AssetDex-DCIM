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

interface QueryConfig {
  table: string;
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: FilterConfig[];
  dateRange?: {
    field: string;
    start: string;
    end: string;
  };
  selectFields?: string[];
  limit?: number;
}

interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | string[] | number;
}

// This is the main handler function that will be called by the main function
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (req.method === 'POST') {
      const body = await req.json();
      const config = body.config || body;
      // Support count aggregation for any table
      if (config.table && config.aggregation === 'count') {
        // Chain .select() first so filter methods are available
        let query = supabaseClient.from(config.table).select('id', { count: 'exact', head: true });
        // Debug: log available methods on query object
        console.log('Supabase query builder keys:', Object.keys(query));
        console.log('Supabase query builder prototype:', Object.getPrototypeOf(query));
        // Phase 1: Map plural and hierarchical filter fields to correct column names for servers table
        const fieldMap = {
          models: 'model',
          allocations: 'allocation',
          environments: 'environment',
          // Hierarchical Data Center Location mappings (use dc_ prefix to match schema)
          dc_sites: 'dc_site',
          dc_buildings: 'dc_building',
          dc_floors: 'dc_floor',
          dc_rooms: 'dc_room',
        };
        let mappedFilters: FilterConfig[] = [];
        if (Array.isArray(config.filters)) {
          for (const filter of config.filters) {
            let field = filter.field;
            if (config.table === 'servers' && fieldMap[field]) {
              field = fieldMap[field];
            }
            mappedFilters.push({ ...filter, field });
          }
        }
        // Phase 2: Apply Supabase filter methods (no reassignment)
        for (const filter of mappedFilters) {
          if (!filter.field || !filter.operator) continue;
          switch (filter.operator) {
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
            case 'gt':
              query = query.gt(filter.field, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.field, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.field, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.field, filter.value);
              break;
            default:
              // Unknown operator, skip
              break;
          }
        }
        // Query already has .select() chained above
        const { count, error } = await query;
        if (error) {
          console.error('Widget data filter error:', error);
          throw error;
        }
        // Return { value: count } for widget compatibility
        return new Response(
          JSON.stringify({ success: true, data: { value: count }, config }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Support sum aggregation
      if (config.table && config.aggregation === 'sum' && config.field) {
        const { data, error } = await supabaseClient
          .from(config.table)
          .select(`${config.field}`);
        if (error) {
          throw error;
        }
        const sum = Array.isArray(data) ? data.reduce((acc, row) => acc + (row[config.field] || 0), 0) : 0;
        return new Response(
          JSON.stringify({ success: true, data: { value: sum }, config }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Add more widget types/logic here as needed
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported widget config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET logic (e.g., schema discovery) can go here

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid method' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Widget data error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Start the Deno HTTP server
serve(handler);
