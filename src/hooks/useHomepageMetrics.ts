import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HomepageMetrics {
  totalServers: number;
  activeServers: number;
  maintenanceServers: number;
  offlineServers: number;
  warrantyExpiring: number;
  recentAdditions: number;
  capacityUtilization: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

export interface ChartData {
  serversByModel: Array<{ name: string; count: number; color: string }>;
  serversByLocation: Array<{ location: string; servers: number }>;
}

export interface HomepageAlert {
  id: string;
  type: 'warranty' | 'capacity' | 'maintenance' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  created_at: string;
  server_id?: string;
  actionable: boolean;
  action_url?: string;
  action_label?: string;
}

export interface RecentActivity {
  id: string;
  action_type: string;
  details: string;
  created_at: string;
  user_email: string;
  entity_type: string;
  entity_id: string;
}

export function useHomepageMetrics() {
  const [metrics, setMetrics] = useState<HomepageMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [alerts, setAlerts] = useState<HomepageAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchServerMetrics = useCallback(async () => {
    try {
      // Get server counts by status
      const { data: serverCounts, error: serverError } = await supabase
        .from('servers')
        .select('status, created_at, warranty');

      if (serverError) throw serverError;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Calculate metrics
      const totalServers = serverCounts?.length || 0;
      const activeServers = serverCounts?.filter(s => s.status === 'Active').length || 0;
      const maintenanceServers = serverCounts?.filter(s => s.status === 'Maintenance').length || 0;
      const offlineServers = serverCounts?.filter(s => s.status === 'Offline').length || 0;
      
      const recentAdditions = serverCounts?.filter(s => 
        s.created_at && new Date(s.created_at) > oneWeekAgo
      ).length || 0;

      const warrantyExpiring = serverCounts?.filter(s => 
        s.warranty && 
        new Date(s.warranty) > now && 
        new Date(s.warranty) < thirtyDaysFromNow
      ).length || 0;

      // For now, set capacity utilization to a reasonable estimate
      // This can be enhanced later when rack data becomes available
      const capacityUtilization = totalServers > 0 ? Math.min(Math.round((totalServers / 100) * 100), 85) : 0;

      // Determine system status
      let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (warrantyExpiring > 5 || capacityUtilization > 85 || offlineServers > 2) {
        systemStatus = 'critical';
      } else if (warrantyExpiring > 0 || capacityUtilization > 75 || offlineServers > 0) {
        systemStatus = 'warning';
      }

      const metricsData: HomepageMetrics = {
        totalServers,
        activeServers,
        maintenanceServers,
        offlineServers,
        warrantyExpiring,
        recentAdditions,
        capacityUtilization,
        systemStatus,
        lastUpdated: new Date().toISOString()
      };

      setMetrics(metricsData);
      return metricsData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server metrics';
      console.error('Homepage metrics error:', err);
      setError(errorMessage);
      return null;
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      // Fetch servers for chart data
      const { data: servers, error: serversError } = await supabase
        .from('servers')
        .select('model, dc_site, dc_room, dc_floor');

      if (serversError) {
        console.error('Error fetching chart data:', serversError);
        return null;
      }

      if (!servers || servers.length === 0) {
        return {
          serversByModel: [],
          serversByLocation: []
        };
      }

      // Process server models data
      const modelCounts = servers.reduce((acc: Record<string, number>, server) => {
        const model = server.model || 'Unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {});

      // Create color palette for models
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', 
        '#ef4444', '#6b7280', '#06b6d4', '#84cc16',
        '#f97316', '#ec4899'
      ];

      const serversByModel = Object.entries(modelCounts)
        .map(([name, count], index) => ({
          name,
          count: count as number,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.count - a.count);

      // Process location data - group by DC site only (not room)
      const locationCounts = servers.reduce((acc: Record<string, number>, server) => {
        const site = server.dc_site || 'Unknown DC';
        acc[site] = (acc[site] || 0) + 1;
        return acc;
      }, {});

      const serversByLocation = Object.entries(locationCounts)
        .map(([location, servers]) => ({
          location,
          servers: servers as number
        }))
        .sort((a, b) => b.servers - a.servers);

      const chartData: ChartData = {
        serversByModel,
        serversByLocation
      };

      setChartData(chartData);
      return chartData;

    } catch (err) {
      console.error('Chart data fetch error:', err);
      return null;
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const alerts: HomepageAlert[] = [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Warranty expiration alerts
      const { data: warrantyServers, error: warrantyError } = await supabase
        .from('servers')
        .select('id, hostname, warranty')
        .not('warranty', 'is', null)
        .gt('warranty', now.toISOString())
        .lt('warranty', thirtyDaysFromNow.toISOString())
        .order('warranty', { ascending: true });

      if (warrantyError) throw warrantyError;

      warrantyServers?.forEach(server => {
        if (!server.warranty) return;
        
        const daysUntilExpiry = Math.ceil(
          (new Date(server.warranty).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        alerts.push({
          id: `warranty-${server.id}`,
          type: 'warranty',
          severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
          title: 'Warranty Expiring Soon',
          description: `${server.hostname} warranty expires in ${daysUntilExpiry} days`,
          created_at: server.warranty,
          server_id: server.id,
          actionable: true,
          action_url: `/servers?search=${server.hostname}`,
          action_label: 'View Server'
        });
      });

      // Get servers with offline status
      const { data: offlineServers, error: offlineError } = await supabase
        .from('servers')
        .select('id, hostname')
        .eq('status', 'Offline');

      if (offlineError) throw offlineError;

      if (offlineServers && offlineServers.length > 0) {
        alerts.push({
          id: `offline-servers`,
          type: 'system',
          severity: 'warning',
          title: 'Servers Offline',
          description: `${offlineServers.length} server(s) are currently offline`,
          created_at: now.toISOString(),
          actionable: true,
          action_url: `/servers?filter=status:Offline`,
          action_label: 'View Offline Servers'
        });
      }

      // Sort alerts by severity and date
      alerts.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setAlerts(alerts.slice(0, 5)); // Show top 5 alerts
      return alerts;

    } catch (err) {
      console.error('Homepage alerts error:', err);
      return [];
    }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      // Check if activity_logs table exists, if not, create mock recent activity
      const { data: activities, error: activityError } = await supabase
        .from('servers')
        .select('id, hostname, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(3);

      if (activityError) {
        console.warn('Activity logs not available, using server data:', activityError);
        setRecentActivity([]);
        return [];
      }

      // Create simple activity from recent servers
      const mockActivities: RecentActivity[] = (activities || []).map((server) => ({
        id: `activity-${server.id}`,
        action_type: 'server_created',
        details: `Server ${server.hostname} was added to inventory`,
        created_at: server.created_at,
        user_email: server.created_by || 'system',
        entity_type: 'server',
        entity_id: server.id
      }));
      
      setRecentActivity(mockActivities);
      return mockActivities;

    } catch (err) {
      console.error('Recent activity error:', err);
      setRecentActivity([]);
      return [];
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchServerMetrics(),
        fetchChartData(),
        fetchAlerts(),
        fetchRecentActivity()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch homepage data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchServerMetrics, fetchChartData, fetchAlerts, fetchRecentActivity, toast]);

  useEffect(() => {
    fetchAllData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return { 
    metrics, 
    chartData,
    alerts, 
    recentActivity,
    loading, 
    error, 
    refresh: fetchAllData 
  };
}
