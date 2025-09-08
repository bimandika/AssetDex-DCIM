import { useState, useEffect } from 'react';

export interface PowerSummary {
  total_capacity_watts: number;
  total_usage_watts: number;
  usage_percent: number;
  dc_count: number;
  room_count: number;
  rack_count: number;
  server_count: number;
}

export interface FloorPowerSummary {
  floor_name: string;
  total_capacity_watts: number;
  total_usage_watts: number;
  usage_percent: number;
  room_count: number;
  rack_count: number;
  rooms: Record<string, {
    room: string;
    capacity_watts: number;
    usage_watts: number;
    usage_percent: number;
    rack_count: number;
    server_count: number;
  }>;
}

export interface RackPowerSummary {
  rack_name: string;
  power_capacity_watts: number;
  power_usage_watts: number;
  power_usage_percent: number;
  server_count: number;
  status: string;
}

export const usePowerData = () => {
  const [globalPower, setGlobalPower] = useState<PowerSummary | null>(null);
  const [floorPower, setFloorPower] = useState<FloorPowerSummary | null>(null);
  const [rackPowerData, setRackPowerData] = useState<Record<string, RackPowerSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseURL = 'http://localhost:8000/functions/v1';

  const fetchGlobalPower = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${baseURL}/power-usage`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setGlobalPower(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch global power data');
      console.error('Global power fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorPower = async (dc: string, floor: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${baseURL}/power-usage?dc=${dc}&floor=${floor}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setFloorPower(data[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch floor power data');
      console.error('Floor power fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomPower = async (dc: string, floor: string, room: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${baseURL}/power-usage?dc=${dc}&floor=${floor}&room=${room}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: RackPowerSummary[] = await response.json();
      
      // Convert array to object keyed by rack_name
      const rackPowerMap: Record<string, RackPowerSummary> = {};
      data.forEach(rack => {
        rackPowerMap[rack.rack_name] = rack;
      });
      setRackPowerData(rackPowerMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room power data');
      console.error('Room power fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPowerStatus = (usagePercent: number): 'normal' | 'warning' | 'critical' => {
    if (usagePercent >= 90) return 'critical';
    if (usagePercent >= 80) return 'warning';
    return 'normal';
  };

  const formatPower = (watts: number): string => {
    if (watts >= 1000000) return `${(watts / 1000000).toFixed(1)}MW`;
    if (watts >= 1000) return `${(watts / 1000).toFixed(0)}kW`;
    return `${watts}W`;
  };

  // Auto-fetch global power on mount
  useEffect(() => {
    fetchGlobalPower();
  }, []);

  return {
    globalPower,
    floorPower,
    rackPowerData,
    loading,
    error,
    fetchGlobalPower,
    fetchFloorPower,
    fetchRoomPower,
    getPowerStatus,
    formatPower
  };
};
