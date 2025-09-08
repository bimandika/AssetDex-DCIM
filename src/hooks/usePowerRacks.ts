import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PowerRackInfo {
  id: string;
  name: string;
  location: string;
  room: string;
  site: string;
  building: string;
  floor: string;
  utilization: number;
  totalServers: number;
  status: 'Active' | 'Maintenance' | 'Offline';
  currentWatts: number;
  capacityWatts: number;
  usagePercent: number;
  remainingWatts: number;
}

interface UsePowerRacksResult {
  racksData: PowerRackInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePowerRacks = (): UsePowerRacksResult => {
  const [racksData, setRacksData] = useState<PowerRackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPowerRacks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all rack metadata with power information
      const { data: rackMetadata, error: rackError } = await supabase
        .from('rack_metadata')
        .select('*')
        .order('rack_name');

      if (rackError) throw rackError;

      if (!rackMetadata || rackMetadata.length === 0) {
        setRacksData([]);
        return;
      }

      // Get all servers to calculate utilization
      const { data: servers, error: serversError } = await supabase
        .from('servers')
        .select(`
          id,
          rack,
          unit_height,
          status,
          hostname
        `)
        .in('rack', rackMetadata.map(r => r.rack_name));

      if (serversError) throw serversError;

      // Get power data for all racks using the power functions
      const powerPromises = rackMetadata.map(async (rack) => {
        try {
          const { data: powerData, error: powerError } = await supabase
            .rpc('get_rack_power_summary', { rack_name_param: rack.rack_name });

          if (powerError) {
            console.warn(`Power data error for ${rack.rack_name}:`, powerError);
            return null;
          }

          return {
            rack_name: rack.rack_name,
            ...powerData[0]
          };
        } catch (err) {
          console.warn(`Failed to get power data for ${rack.rack_name}:`, err);
          return null;
        }
      });

      const powerResults = await Promise.all(powerPromises);

      // Group servers by rack
      const serversByRack = (servers || []).reduce((acc, server) => {
        if (!acc[server.rack]) {
          acc[server.rack] = [];
        }
        acc[server.rack].push(server);
        return acc;
      }, {} as Record<string, typeof servers>);

      // Transform data to PowerRackInfo format
      const transformedRacks: PowerRackInfo[] = rackMetadata.map((rack, index) => {
        const rackServers = serversByRack[rack.rack_name] || [];
        const totalUnits = rack.total_units || 42;
        const occupiedUnits = rackServers.reduce((sum, server) => sum + (server.unit_height || 1), 0);
        const utilization = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

        const powerData = powerResults[index];
        
        // Determine status based on power usage or server status
        let status: 'Active' | 'Maintenance' | 'Offline' = 'Active';
        if (powerData?.status === 'critical' || powerData?.usage_percent > 90) {
          status = 'Maintenance';
        } else if (rackServers.length === 0) {
          status = 'Offline';
        }

        return {
          id: rack.rack_name,
          name: rack.rack_name,
          location: `${rack.dc_site} - ${rack.dc_building}`,
          room: rack.dc_room || '',
          site: rack.dc_site || '',
          building: rack.dc_building || '',
          floor: rack.dc_floor || '',
          utilization,
          totalServers: rackServers.length,
          status,
          currentWatts: powerData?.current_watts || 0,
          capacityWatts: powerData?.capacity_watts || rack.power_capacity_watts || 8000,
          usagePercent: powerData?.usage_percent || 0,
          remainingWatts: powerData?.remaining_watts || 0
        };
      });

      console.log('✅ Fetched power racks:', transformedRacks.length, 'racks');
      setRacksData(transformedRacks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch power racks';
      console.error('❌ usePowerRacks error:', err);
      setError(errorMessage);
      setRacksData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPowerRacks();
  }, []);

  return { racksData, loading, error, refetch: fetchPowerRacks };
};

export type { PowerRackInfo };
