import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Deno environment type declarations
// ...existing code...
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
};

export const handler = async (req: Request): Promise<Response> => {
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
      const columns: string[] = Array.isArray(body.columns) ? body.columns : [];
      const limit = typeof body.limit === 'number' ? body.limit : 100;
      const offset = typeof body.offset === 'number' ? body.offset : 0;
      const dcSite = body.dc_site;
      const allocation = body.allocation;
      const deviceType = body.device_type;
      const environment = body.environment;
      const status = body.status;
      const brand = body.brand;
      const model = body.model;
      const operatingSystem = body.operating_system;
      const dcBuilding = body.dc_building;
      const dcFloor = body.dc_floor;
      const dcRoom = body.dc_room;
      // Validate columns (basic check)
      if (!columns.length || columns.length > 3) {
        return new Response(JSON.stringify({ error: 'You must select 1-3 columns.' }), { status: 400, headers: corsHeaders });
      }
      // Build select string
      const selectStr = columns.join(',');
      let query = supabaseClient.from('servers').select(selectStr);
      if (dcSite) {
        query = query.eq('dc_site', dcSite);
      }
      if (allocation) {
        query = query.eq('allocation', allocation);
      }
      if (deviceType) {
        query = query.eq('device_type', deviceType);
      }
      if (environment) {
        query = query.eq('environment', environment);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (brand) {
        query = query.eq('brand', brand);
      }
      if (model) {
        query = query.eq('model', model);
      }
      if (operatingSystem) {
        query = query.eq('operating_system', operatingSystem);
      }
      if (dcBuilding) {
        query = query.eq('dc_building', dcBuilding);
      }
      if (dcFloor) {
        query = query.eq('dc_floor', dcFloor);
      }
      if (dcRoom) {
        query = query.eq('dc_room', dcRoom);
      }
      query = query.range(offset, offset + limit - 1);
      const { data, error } = await query;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Invalid method' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
};

serve(handler);
