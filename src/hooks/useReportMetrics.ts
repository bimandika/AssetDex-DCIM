import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReportMetrics {
  totalServers?: number;
  serversByModel?: ModelDistribution[];
  serversByStatus?: StatusDistribution[];
  warrantyExpiration?: WarrantyData[];
  utilizationByDataCenter?: UtilizationData[];
  activityLogs?: ActivityLogData[];
  activityByUser?: ActivityByUserData[];
  activityByType?: ActivityByTypeData[];
  totalActivities?: number;
  
  // Inventory metrics
  serversByLocation?: LocationDistribution[];
  deviceTypeDistribution?: DeviceTypeDistribution[];
  serversByBrand?: BrandDistribution[];
  operatingSystemDistribution?: OSDistribution[];
  allocationTypeDistribution?: AllocationDistribution[];
  environmentDistribution?: EnvironmentDistribution[];
  
  // Warranty metrics
  warrantyStatus?: WarrantyStatusData[];
  serversNeedingRenewal?: RenewalData[];
  warrantyCoverageByBrand?: WarrantyCoverageData[];
  
  // Utilization metrics
  rackCapacityByDC?: RackCapacityData[];
  topUtilizedRacks?: TopRacksData[];
  deviceTypeByLocation?: DeviceTypeByLocationData[];
  
  // Maintenance metrics
  maintenanceByLocation?: MaintenanceLocationData[];
  maintenanceByModel?: MaintenanceModelData[];
  maintenanceVsActive?: MaintenanceStatusData[];
  
  lastUpdated: string;
}

export interface ModelDistribution {
  model: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

export interface WarrantyData {
  month: string;
  expiring: number;
}

export interface UtilizationData {
  dataCenter: string;
  utilization: number;
  servers: number;
  capacity: number;
}

export interface ActivityLogData {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  changes: any;
  created_at: string;
}

export interface ActivityByUserData {
  user_email: string;
  user_name: string | null;
  action_type: string;
  action_count: number;
}

export interface ActivityByTypeData {
  action_type: string;
  count: number;
  unique_users: number;
  color: string;
}

// Inventory interfaces
export interface LocationDistribution {
  location: string;
  count: number;
  fill: string;
}

export interface DeviceTypeDistribution {
  deviceType: string;
  count: number;
  fill: string;
}

export interface BrandDistribution {
  brand: string;
  count: number;
  fill: string;
}

export interface OSDistribution {
  os: string;
  count: number;
  fill: string;
}

export interface AllocationDistribution {
  allocation: string;
  count: number;
  fill: string;
}

export interface EnvironmentDistribution {
  environment: string;
  count: number;
  fill: string;
}

// Warranty interfaces
export interface WarrantyStatusData {
  status: string;
  count: number;
  fill: string;
}

export interface RenewalData {
  month: string;
  count: number;
}

export interface WarrantyCoverageData {
  brand: string;
  active: number;
  expired: number;
  none: number;
  total: number;
  activePct: number;
}

// Utilization interfaces
export interface RackCapacityData {
  dataCenter: string;
  racks: number;
  totalCapacity: number;
  used: number;
  available: number;
  utilizationPct: number;
}

export interface TopRacksData {
  rack: string;
  dataCenter: string;
  rackId: string;
  servers: number;
  used: number;
  capacity: number;
  utilizationPct: number;
}

export interface DeviceTypeByLocationData {
  location: string;
  [deviceType: string]: any;
}

// Maintenance interfaces
export interface MaintenanceLocationData {
  location: string;
  maintenance: number;
  active: number;
  other: number;
  total: number;
}

export interface MaintenanceModelData {
  model: string;
  maintenance: number;
  total: number;
  maintenancePct: number;
}

export interface MaintenanceStatusData {
  status: string;
  count: number;
  fill: string;
}

export interface ReportFilters {
  reportType: 'inventory' | 'warranty' | 'utilization' | 'maintenance' | 'activity';
  selectedDataCenter: string;
  dateRange: string;
}

export function useReportMetrics(filters: ReportFilters) {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch data when filters change
  useEffect(() => {
    let isMounted = true;

    const fetchReportData = async () => {
      console.log('useReportMetrics: Fetching with filters:', {
        reportType: filters.reportType,
        selectedDataCenter: filters.selectedDataCenter,
        dateRange: filters.dateRange
      });
      
      setLoading(true);
      setError(null);

      try {        // Get auth session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        // Call Edge Function
        const response = await fetch('http://localhost:8000/functions/v1/report-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ filters }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch report data');
        }

        const result = await response.json();
        
        if (isMounted) {
          if (result.success) {
            setMetrics(result.data);
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        }

      } catch (err: any) {
        if (isMounted) {
          const errorMessage = err.message || 'Failed to load report data';
          setError(errorMessage);
          console.error('Report metrics error:', err);
          
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReportData();

    return () => {
      isMounted = false;
    };
  }, [filters.reportType, filters.selectedDataCenter, filters.dateRange, toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/functions/v1/report-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report data');
      }

      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load report data';
      setError(errorMessage);
      console.error('Report metrics error:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  return {
    metrics,
    loading,
    error,
    refresh
  };
}
