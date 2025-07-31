import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RackUnit {
  unit: number;
  server?: {
    id: string;
    hostname: string;
    serialNumber: string;
    model: string;
    brand: string;
    status: "Active" | "Maintenance" | "Offline" | "Inactive" | "Ready" | "Decommissioned" | "Retired";
    ipAddress: string;
    ipOOB: string;
    deviceType: string;
    allocation: string;
    environment: string;
    unitHeight: number;
  };
  isEmpty: boolean;
  isPartOfMultiUnit?: boolean; // True if this unit is part of a multi-unit server but not the start unit
  multiUnitServerId?: string; // Reference to the server ID for multi-unit servers
}

export interface RackData {
  name: string;
  datacenter_id: string;
  floor: number;
  location: string;
  total_units: number;
  units: RackUnit[];
  statistics: {
    totalServers: number;
    occupiedUnits: number;
    availableUnits: number;
    utilizationPercent: number;
    serversByStatus: Record<string, number>;
  };
}

export type ViewMode = 'physical' | 'logical';

export const useRackData = (rackName: string) => {
  const [rackData, setRackData] = useState<RackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRackData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-rack-data', {
        method: 'POST',
        body: { rackName }
      });

      if (error) throw error;

      // Transform servers data to rack units (42 units total)
      const transformedUnits: RackUnit[] = Array.from({ length: 42 }, (_, i) => {
        const unitNumber = 42 - i; // Top to bottom (U42 to U1)
        
        // Find server(s) in this unit - handle multi-unit servers
        const serversInUnit = data.data.servers.filter((server: any) => {
          const serverStartUnit = parseInt(server.unit.substring(1)); // Extract number from "U25"
          const serverEndUnit = serverStartUnit + (server.unit_height || 1) - 1;
          return unitNumber >= serverStartUnit && unitNumber <= serverEndUnit;
        });

        if (serversInUnit.length > 0) {
          const server = serversInUnit[0]; // Take first server if multiple
          const serverStartUnit = parseInt(server.unit.substring(1));
          const isStartUnit = unitNumber === serverStartUnit; // Check if this is the start unit
          
          return {
            unit: unitNumber,
            server: {
              id: server.id,
              hostname: server.hostname,
              serialNumber: server.serial_number,
              model: server.model,
              brand: server.brand,
              status: server.status,
              ipAddress: server.ip_address,
              ipOOB: server.ip_oob,
              deviceType: server.device_type,
              allocation: server.allocation,
              environment: server.environment,
              operatingSystem: server.operating_system,
              unitHeight: server.unit_height || 1
            },
            isEmpty: false,
            isPartOfMultiUnit: !isStartUnit, // Flag for styling multi-unit servers
            multiUnitServerId: server.id // Reference to the main server
          };
        }
        
        return {
          unit: unitNumber,
          isEmpty: true
        };
      });

      // Calculate statistics
      const servers = data.data.servers;
      const occupiedUnits = transformedUnits.filter(u => !u.isEmpty).length;
      const serversByStatus = servers.reduce((acc: Record<string, number>, server: any) => {
        acc[server.status] = (acc[server.status] || 0) + 1;
        return acc;
      }, {});

      setRackData({
        name: data.data.name,
        datacenter_id: data.data.datacenter_id,
        floor: data.data.floor,
        location: data.data.location,
        total_units: data.data.total_units,
        units: transformedUnits,
        statistics: {
          totalServers: servers.length,
          occupiedUnits,
          availableUnits: 42 - occupiedUnits,
          utilizationPercent: Math.round((occupiedUnits / 42) * 100),
          serversByStatus
        }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rackName) {
      fetchRackData();
    }
  }, [rackName]);

  return { rackData, loading, error, refetch: fetchRackData };
};
