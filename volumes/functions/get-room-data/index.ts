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
    const { site, building, floor, room } = await req.json();
    
    // Create a Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the query conditions based on provided filters
    let rackQuery = supabase
      .from('rack_metadata')
      .select('*');

    if (site) {
      rackQuery = rackQuery.eq('dc_site', site);
    }
    if (building) {
      rackQuery = rackQuery.eq('dc_building', building);
    }
    if (floor) {
      rackQuery = rackQuery.eq('dc_floor', floor);
    }
    if (room) {
      rackQuery = rackQuery.eq('dc_room', room);
    }

    // Fetch racks matching the filter criteria
    const { data: racks, error: racksError } = await rackQuery.order('rack_name');

    if (racksError) {
      console.error('Error fetching racks:', racksError);
      throw racksError;
    }

    if (!racks || racks.length === 0) {
      return new Response(JSON.stringify({ racks: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get rack names for server query
    const rackNames = racks.map(rack => rack.rack_name);

    // Fetch servers for all racks
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('*')
      .in('rack', rackNames)
      .order('rack')
      .order('unit');

    if (serversError) {
      console.error('Error fetching servers:', serversError);
      throw serversError;
    }

    // Group servers by rack and map database columns to frontend expectations
    const serversByRack = (servers || []).reduce((acc, server) => {
      if (!acc[server.rack]) {
        acc[server.rack] = [];
      }
      
      // Map database columns to frontend expectations
      const mappedServer = {
        id: server.id,
        hostname: server.hostname,
        position: parseInt(server.unit?.replace('U', '') || '1'), // Convert "U1" to 1
        model: server.model,
        type: server.device_type, // Map device_type to type
        status: server.status,
        manufacturer: server.brand, // Map brand to manufacturer
        unitHeight: server.unit_height || 1,
        serialNumber: server.serial_number,
        ipAddress: server.ip_address,
        ipOOB: server.ip_oob,
        deviceType: server.device_type,
        allocation: server.allocation,
        environment: server.environment,
        operatingSystem: server.operating_system,
        warranty: server.warranty,
        notes: server.notes,
        createdAt: server.created_at,
        updatedAt: server.updated_at
      };
      
      acc[server.rack].push(mappedServer);
      return acc;
    }, {});

    // Combine rack metadata with servers and calculate utilization
    const racksWithServers = racks.map(rack => {
      const rackServers = serversByRack[rack.rack_name] || [];
      const totalUnits = rack.total_units || 42;
      const occupiedUnits = rackServers.reduce((sum, server) => sum + (server.unit_height || 1), 0);
      const utilization = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      return {
        id: rack.rack_name,
        name: rack.rack_name,
        location: `${rack.dc_site} ${rack.dc_building} ${rack.dc_floor} ${rack.dc_room}`,
        description: rack.description || '',
        site: rack.dc_site,
        building: rack.dc_building,
        floor: rack.dc_floor,
        room: rack.dc_room,
        status: 'Active', // Default status since rack_metadata doesn't have status
        servers: rackServers,
        serverCount: rackServers.length,
        utilization: utilization,
        occupiedUnits,
        totalUnits
      };
    });

    return new Response(JSON.stringify({ racks: racksWithServers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-room-data:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
