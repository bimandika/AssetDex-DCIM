import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServerInfo {
  id: string;
  hostname: string;
  position: number;
  model: string;
  type: "Server" | "Network" | "Storage";
  status: "Active" | "Maintenance" | "Offline";
  manufacturer: string;
  unitHeight: number;
  serialNumber?: string;
  ipAddress?: string;
  ipOOB?: string;
  deviceType?: string;
  allocation?: string;
  environment?: string;
}

interface RackInfo {
  id: string;
  name: string;
  location: string;
  description?: string;
  utilization: number;
  totalServers: number;
  status: "Active" | "Maintenance" | "Offline";
  room: string;
  servers: ServerInfo[];
}

interface FilterState {
  dc_site?: string;
  dc_building?: string;
  dc_floor?: string;
  dc_room?: string;
}

interface UseRoomDataResult {
  racksData: RackInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useRoomData = (filters: FilterState): UseRoomDataResult => {
  const [racksData, setRacksData] = useState<RackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = async () => {
    if (!filters.dc_site || !filters.dc_building || !filters.dc_floor || !filters.dc_room) {
      setRacksData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('get-room-data', {
        body: { 
          site: filters.dc_site,
          building: filters.dc_building,
          floor: filters.dc_floor,
          room: filters.dc_room
        }
      });

      if (supabaseError) throw supabaseError;
      
      console.log('🔍 get-room-data response:', data);
      
      // Transform the data to match RoomView.tsx expected format
      const transformedRacks: RackInfo[] = data?.racks?.map((rack: any) => {
        return {
          id: rack.id || rack.name,
          name: rack.name,
          location: rack.location || `${filters.dc_building} - Floor ${filters.dc_floor}`,
          description: rack.description, // Add rack description mapping
          utilization: rack.utilization || 0,
          totalServers: rack.serverCount || rack.servers?.length || 0,
          status: 'Active', // Default status since get-room-data doesn't return rack status
          room: filters.dc_room || '',
          servers: rack.servers?.map((server: any) => {
            const position = server.position || parseInt(server.unit?.replace('U', '') || '1');
            return {
              id: server.id,
              hostname: server.hostname,
              position: position,
              model: server.model || 'Unknown',
              type: 'Server' as const,
              status: server.status || 'Active',
              manufacturer: server.manufacturer || server.brand || 'Unknown',
              unitHeight: server.unitHeight || server.unit_height || 1,
              serialNumber: server.serialNumber || server.serial_number,
              ipAddress: server.ipAddress || server.ip_address,
              ipOOB: server.ipOOB || server.ip_oob,
              deviceType: server.deviceType || server.device_type,
              allocation: server.allocation,
              environment: server.environment
            };
          }) || []
        };
      }) || [];

      console.log('✅ Transformed racks for RoomView:', transformedRacks.length, 'racks');
      setRacksData(transformedRacks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room data');
      setRacksData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [filters.dc_site, filters.dc_building, filters.dc_floor, filters.dc_room]);

  return { racksData, loading, error, refetch: fetchRoomData };
};
