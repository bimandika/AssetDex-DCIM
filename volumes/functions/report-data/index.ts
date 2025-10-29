import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface ReportFilters {
  reportType: 'inventory' | 'warranty' | 'utilization' | 'maintenance' | 'activity';
  selectedDataCenter: string;
  dateRange: string;
}

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body
    const { filters } = await req.json() as { filters: ReportFilters };
    const { reportType, selectedDataCenter, dateRange } = filters;

    console.log('Report data request:', { reportType, selectedDataCenter, dateRange });

    let metrics: any = {
      lastUpdated: new Date().toISOString()
    };

    // Fetch different data based on report type
    if (reportType === 'activity') {
      // ACTIVITY LOGS REPORT
      metrics = await generateActivityReport(supabase, dateRange);
    } else {
      // STANDARD INVENTORY/WARRANTY/UTILIZATION REPORTS
      // Build base query
      let query = supabase.from('servers').select('*');

      // Apply datacenter filter
      if (selectedDataCenter && selectedDataCenter !== 'all') {
        console.log('Filtering by datacenter:', selectedDataCenter);
        query = query.eq('dc_site', selectedDataCenter);
      }

      // Apply date range filter (for created_at field)
      if (dateRange && dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        console.log('Filtering by date range:', days, 'days, since:', startDate.toISOString());
        query = query.gte('created_at', startDate.toISOString());
      }

      // Fetch all servers with filters
      const { data: servers, error } = await query;
      
      if (error) throw error;

      console.log('Fetched servers count:', servers.length);

      // Calculate metrics based on report type
      if (reportType === 'inventory') {
        metrics = {
          totalServers: servers.length,
          serversByModel: calculateServersByModel(servers),
          serversByStatus: calculateServersByStatus(servers),
          serversByLocation: calculateServersByLocation(servers),
          deviceTypeDistribution: calculateDeviceTypeDistribution(servers),
          serversByBrand: calculateServersByBrand(servers),
          operatingSystemDistribution: calculateOSDistribution(servers),
          allocationTypeDistribution: calculateAllocationDistribution(servers),
          environmentDistribution: calculateEnvironmentDistribution(servers),
          lastUpdated: new Date().toISOString()
        };
      } else if (reportType === 'warranty') {
        metrics = {
          totalServers: servers.length,
          warrantyExpiration: calculateWarrantyExpiration(servers),
          warrantyStatus: calculateWarrantyStatus(servers),
          serversNeedingRenewal: calculateServersNeedingRenewal(servers),
          warrantyCoverageByBrand: calculateWarrantyCoverageByBrand(servers),
          lastUpdated: new Date().toISOString()
        };
      } else if (reportType === 'utilization') {
        metrics = {
          totalServers: servers.length,
          utilizationByDataCenter: await calculateUtilizationByDataCenter(supabase, servers),
          rackCapacityByDC: await calculateRackCapacityByDC(supabase, servers),
          topUtilizedRacks: await calculateTopUtilizedRacks(supabase, servers),
          deviceTypeByLocation: calculateDeviceTypeByLocation(servers),
          lastUpdated: new Date().toISOString()
        };
      } else if (reportType === 'maintenance') {
        metrics = {
          totalServers: servers.length,
          maintenanceByLocation: calculateMaintenanceByLocation(servers),
          maintenanceByModel: calculateMaintenanceByModel(servers),
          maintenanceVsActive: calculateMaintenanceVsActive(servers),
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Default - show all metrics
        metrics = {
          totalServers: servers.length,
          serversByModel: calculateServersByModel(servers),
          serversByStatus: calculateServersByStatus(servers),
          warrantyExpiration: calculateWarrantyExpiration(servers),
          utilizationByDataCenter: await calculateUtilizationByDataCenter(supabase, servers),
          lastUpdated: new Date().toISOString()
        };
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: metrics }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err: any) {
    console.error('Report data error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};

// NEW: Generate Activity Report
async function generateActivityReport(supabase: any, dateRange: string) {
  const days = dateRange && dateRange !== 'all' ? parseInt(dateRange) : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch activity logs (without join first, then try to get user details separately)
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      console.warn('Activity logs error:', logsError);
      // Return empty data if activity_logs table doesn't exist yet
      return {
        activityLogs: [],
        activityByUser: [],
        activityByType: [],
        totalActivities: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // If no logs, return empty data
    if (!activityLogs || activityLogs.length === 0) {
      return {
        activityLogs: [],
        activityByUser: [],
        activityByType: [],
        totalActivities: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // Try to fetch user profiles separately
    const userIds = [...new Set(activityLogs.map((log: any) => log.user_id).filter(Boolean))];
    let userProfiles: Record<string, any> = {};

    if (userIds.length > 0) {
      try {
        // Try to get user info from auth.users first
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        
        if (authUsers?.users) {
          authUsers.users.forEach((user: any) => {
            if (userIds.includes(user.id)) {
              userProfiles[user.id] = {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
              };
            }
          });
        }

        // Also try profiles table for additional info
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        if (profiles) {
          profiles.forEach((profile: any) => {
            // Merge with existing or create new
            if (userProfiles[profile.id]) {
              userProfiles[profile.id] = {
                ...userProfiles[profile.id],
                full_name: profile.full_name || userProfiles[profile.id].full_name,
                email: profile.email || userProfiles[profile.id].email
              };
            } else {
              userProfiles[profile.id] = profile;
            }
          });
        }
      } catch (profileError) {
        console.warn('Could not fetch profiles:', profileError);
        // Continue without user profiles
      }
    }

    // Transform activity logs with user info
    const transformedLogs = activityLogs.map((log: any) => {
      const profile = log.user_id ? userProfiles[log.user_id] : null;
      const userEmail = profile?.email || 'System';
      const userName = profile?.full_name || profile?.email?.split('@')[0] || 'System User';
      
      return {
        id: log.id,
        user_id: log.user_id,
        user_email: userEmail,
        user_name: userName,
        action_type: log.action || 'unknown', // Use 'action' column from database
        entity_type: log.resource_type || 'unknown', // Use 'resource_type' column
        entity_id: log.resource_id || null, // Use 'resource_id' column
        changes: log.details || {}, // Use 'details' column for changes
        created_at: log.created_at
      };
    });

  // Calculate activity by user
  const userActivity = transformedLogs.reduce((acc: any, log: any) => {
    const key = `${log.user_email}:${log.action_type}`;
    if (!acc[key]) {
      acc[key] = {
        user_email: log.user_email,
        user_name: log.user_name,
        action_type: log.action_type,
        action_count: 0
      };
    }
    acc[key].action_count += 1;
    return acc;
  }, {});

  const activityByUser = Object.values(userActivity)
    .sort((a: any, b: any) => b.action_count - a.action_count);

  // Calculate activity by type
  const typeActivity = transformedLogs.reduce((acc: any, log: any) => {
    const type = log.action_type;
    if (!acc[type]) {
      acc[type] = {
        action_type: type,
        count: 0,
        unique_users: new Set()
      };
    }
    acc[type].count += 1;
    acc[type].unique_users.add(log.user_email);
    return acc;
  }, {});

  const actionTypeColors: Record<string, string> = {
    'create': '#10b981',
    'update': '#3b82f6',
    'delete': '#ef4444',
    'login': '#8b5cf6',
    'export': '#f59e0b',
    'import': '#06b6d4',
    'MAINTENANCE': '#f59e0b',
    'COMPONENT_REPLACEMENT': '#ef4444',
    'DECOMMISSION': '#7c3aed',
    'AUDIT': '#0891b2',
    'SECURITY_AUDIT': '#dc2626',
    'SITE_VISIT': '#84cc16',
    'TROUBLESHOOTING': '#eab308',
    'HEALTH_CHECK': '#22c55e',
    'CUSTOM': '#64748b'
  };

  const activityByType = Object.entries(typeActivity).map(([type, data]: [string, any]) => ({
    action_type: type,
    count: data.count,
    unique_users: data.unique_users.size,
    color: actionTypeColors[type] || '#64748b'
  })).sort((a, b) => b.count - a.count);

  return {
    activityLogs: transformedLogs,
    activityByUser,
    activityByType,
    totalActivities: transformedLogs.length,
    lastUpdated: new Date().toISOString()
  };
  } catch (error) {
    console.error('Error generating activity report:', error);
    return {
      activityLogs: [],
      activityByUser: [],
      activityByType: [],
      totalActivities: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Calculate servers by model distribution
function calculateServersByModel(servers: any[]): any[] {
  const modelCounts = servers.reduce((acc: any, server) => {
    const model = server.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];
  const total = servers.length;

  return Object.entries(modelCounts)
    .map(([model, count]: [string, any], index) => ({
      model,
      count,
      percentage: Math.round((count / total) * 100),
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate servers by status distribution
function calculateServersByStatus(servers: any[]): any[] {
  const statusCounts = servers.reduce((acc: any, server) => {
    const status = server.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusColors: Record<string, string> = {
    'Active': '#10b981',
    'Inactive': '#ef4444',
    'Maintenance': '#f59e0b',
    'Decommissioned': '#6b7280',
    'unknown': '#94a3b8'
  };

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    color: statusColors[status] || '#94a3b8'
  })).sort((a, b) => (b.count as number) - (a.count as number));
}

// Calculate warranty expiration data
function calculateWarrantyExpiration(servers: any[]): any[] {
  const monthCounts: Record<string, number> = {};
  const now = new Date();

  servers.forEach(server => {
    if (server.warranty) {
      const expiryDate = new Date(server.warranty);
      if (expiryDate > now) {
        const monthKey = expiryDate.toISOString().slice(0, 7); // YYYY-MM
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      }
    }
  });

  // Get next 12 months
  const result = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    result.push({
      month: monthName,
      expiring: monthCounts[monthKey] || 0
    });
  }

  return result;
}

// Calculate utilization by data center
async function calculateUtilizationByDataCenter(supabase: any, servers: any[]): Promise<any[]> {
  // Group servers by datacenter
  const dcGroups = servers.reduce((acc: any, server) => {
    const dc = server.dc_site || 'Unknown';
    if (!acc[dc]) {
      acc[dc] = [];
    }
    acc[dc].push(server);
    return acc;
  }, {});

  // Fetch rack metadata for capacity info
  const { data: rackData } = await supabase
    .from('rack_metadata')
    .select('data_center, total_ru');

  // Calculate capacity per datacenter
  const capacityByDC = (rackData || []).reduce((acc: any, rack: any) => {
    const dc = rack.data_center;
    acc[dc] = (acc[dc] || 0) + (rack.total_ru || 0);
    return acc;
  }, {});

  // Calculate utilization
  return Object.entries(dcGroups).map(([dataCenter, dcServers]: [string, any]) => {
    const totalUnits = dcServers.reduce((sum: number, s: any) => sum + (s.rack_units || 1), 0);
    const totalCapacity = capacityByDC[dataCenter] || 100;

    return {
      dataCenter,
      servers: dcServers.length,
      capacity: totalCapacity,
      utilization: Math.round((totalUnits / totalCapacity) * 100)
    };
  }).sort((a, b) => b.utilization - a.utilization);
}

// Calculate servers by location (datacenter)
function calculateServersByLocation(servers: any[]): any[] {
  const locationCounts: Record<string, number> = {};
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  
  servers.forEach(server => {
    const location = server.dc_site || 'Unknown';
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  });

  return Object.entries(locationCounts)
    .map(([location, count], index) => ({
      location,
      count,
      fill: colors[index % colors.length]
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate device type distribution
function calculateDeviceTypeDistribution(servers: any[]): any[] {
  const typeCounts: Record<string, number> = {};
  const colors = {
    'Server': '#3b82f6',
    'Storage': '#10b981',
    'Network': '#f59e0b',
    'Other': '#6b7280'
  };
  
  servers.forEach(server => {
    const deviceType = server.device_type || 'Other';
    typeCounts[deviceType] = (typeCounts[deviceType] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([deviceType, count]) => ({
      deviceType,
      count,
      fill: colors[deviceType as keyof typeof colors] || colors.Other
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate servers by brand
function calculateServersByBrand(servers: any[]): any[] {
  const brandCounts: Record<string, number> = {};
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
  
  servers.forEach(server => {
    const brand = server.brand || 'Unknown';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  return Object.entries(brandCounts)
    .map(([brand, count], index) => ({
      brand,
      count,
      fill: colors[index % colors.length]
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate operating system distribution
function calculateOSDistribution(servers: any[]): any[] {
  const osCounts: Record<string, number> = {};
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  servers.forEach(server => {
    const os = server.operating_system || 'Unknown';
    osCounts[os] = (osCounts[os] || 0) + 1;
  });

  return Object.entries(osCounts)
    .map(([os, count], index) => ({
      os,
      count,
      fill: colors[index % colors.length]
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate allocation type distribution
function calculateAllocationDistribution(servers: any[]): any[] {
  const allocationCounts: Record<string, number> = {};
  const colors = {
    'IAAS': '#3b82f6',
    'PAAS': '#10b981',
    'SAAS': '#f59e0b',
    'Load Balancer': '#ef4444',
    'Database': '#8b5cf6',
    'Other': '#6b7280'
  };
  
  servers.forEach(server => {
    const allocation = server.allocation || 'Other';
    allocationCounts[allocation] = (allocationCounts[allocation] || 0) + 1;
  });

  return Object.entries(allocationCounts)
    .map(([allocation, count]) => ({
      allocation,
      count,
      fill: colors[allocation as keyof typeof colors] || colors.Other
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate environment distribution
function calculateEnvironmentDistribution(servers: any[]): any[] {
  const envCounts: Record<string, number> = {};
  const colors = {
    'Production': '#ef4444',
    'Testing': '#f59e0b',
    'Pre-Production': '#3b82f6',
    'Development': '#10b981',
    'Other': '#6b7280'
  };
  
  servers.forEach(server => {
    const environment = server.environment || 'Other';
    envCounts[environment] = (envCounts[environment] || 0) + 1;
  });

  return Object.entries(envCounts)
    .map(([environment, count]) => ({
      environment,
      count,
      fill: colors[environment as keyof typeof colors] || colors.Other
    }))
    .sort((a, b) => b.count - a.count);
}

// Calculate warranty status (Expired, Expiring Soon, Active)
function calculateWarrantyStatus(servers: any[]): any[] {
  const now = new Date();
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  const statuses = {
    'Expired': 0,
    'Expiring Soon (3 months)': 0,
    'Active': 0,
    'No Warranty Info': 0
  };
  
  servers.forEach(server => {
    if (!server.warranty) {
      statuses['No Warranty Info']++;
    } else {
      const expiryDate = new Date(server.warranty);
      if (expiryDate < now) {
        statuses['Expired']++;
      } else if (expiryDate <= threeMonthsFromNow) {
        statuses['Expiring Soon (3 months)']++;
      } else {
        statuses['Active']++;
      }
    }
  });

  const colors = {
    'Expired': '#ef4444',
    'Expiring Soon (3 months)': '#f59e0b',
    'Active': '#10b981',
    'No Warranty Info': '#6b7280'
  };

  return Object.entries(statuses)
    .map(([status, count]) => ({
      status,
      count,
      fill: colors[status as keyof typeof colors]
    }))
    .filter(item => item.count > 0);
}

// Calculate servers needing renewal (next 6 months)
function calculateServersNeedingRenewal(servers: any[]): any[] {
  const now = new Date();
  const monthCounts: Record<string, any[]> = {};

  servers.forEach(server => {
    if (server.warranty) {
      const expiryDate = new Date(server.warranty);
      const monthsUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsUntilExpiry > 0 && monthsUntilExpiry <= 6) {
        const monthKey = expiryDate.toISOString().slice(0, 7);
        if (!monthCounts[monthKey]) {
          monthCounts[monthKey] = [];
        }
        monthCounts[monthKey].push(server);
      }
    }
  });

  const result = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    result.push({
      month: monthName,
      count: (monthCounts[monthKey] || []).length
    });
  }

  return result;
}

// Calculate warranty coverage by brand
function calculateWarrantyCoverageByBrand(servers: any[]): any[] {
  const now = new Date();
  const brandStats: Record<string, { total: number; active: number; expired: number; none: number }> = {};
  
  servers.forEach(server => {
    const brand = server.brand || 'Unknown';
    if (!brandStats[brand]) {
      brandStats[brand] = { total: 0, active: 0, expired: 0, none: 0 };
    }
    
    brandStats[brand].total++;
    
    if (!server.warranty) {
      brandStats[brand].none++;
    } else {
      const expiryDate = new Date(server.warranty);
      if (expiryDate < now) {
        brandStats[brand].expired++;
      } else {
        brandStats[brand].active++;
      }
    }
  });

  return Object.entries(brandStats)
    .map(([brand, stats]) => ({
      brand,
      active: stats.active,
      expired: stats.expired,
      none: stats.none,
      total: stats.total,
      activePct: Math.round((stats.active / stats.total) * 100)
    }))
    .sort((a, b) => b.total - a.total);
}

// Calculate rack capacity by datacenter
async function calculateRackCapacityByDC(supabase: any, servers: any[]): Promise<any[]> {
  // Fetch rack metadata
  const { data: rackData, error } = await supabase
    .from('rack_metadata')
    .select('data_center, rack_id, total_ru, power_capacity_watts');

  if (error) {
    console.error('Error fetching rack metadata:', error);
  }

  // Group by datacenter
  const dcCapacity: Record<string, { racks: number; totalRU: number; usedRU: number; totalPower: number }> = {};
  
  (rackData || []).forEach((rack: any) => {
    const dc = rack.data_center || 'Unknown';
    if (!dcCapacity[dc]) {
      dcCapacity[dc] = { racks: 0, totalRU: 0, usedRU: 0, totalPower: 0 };
    }
    dcCapacity[dc].racks++;
    dcCapacity[dc].totalRU += rack.total_ru || 42;
    dcCapacity[dc].totalPower += rack.power_capacity_watts || 0;
  });

  // Count used RU by datacenter
  servers.forEach(server => {
    const dc = server.dc_site || 'Unknown';
    if (!dcCapacity[dc]) {
      // Initialize if no rack metadata exists for this DC
      dcCapacity[dc] = { racks: 0, totalRU: 0, usedRU: 0, totalPower: 0 };
    }
    dcCapacity[dc].usedRU += server.unit_height || 1;
  });

  // If we have servers but no rack metadata, estimate capacity
  Object.keys(dcCapacity).forEach(dc => {
    if (dcCapacity[dc].totalRU === 0 && dcCapacity[dc].usedRU > 0) {
      // Estimate: assume racks of 42U, 80% utilization target
      const estimatedRacks = Math.ceil(dcCapacity[dc].usedRU / 34); // 34 = 42 * 0.8
      dcCapacity[dc].totalRU = estimatedRacks * 42;
      dcCapacity[dc].racks = estimatedRacks;
    }
  });

  return Object.entries(dcCapacity)
    .filter(([_, stats]) => stats.totalRU > 0) // Only show DCs with capacity data
    .map(([dataCenter, stats]) => ({
      dataCenter,
      racks: stats.racks,
      totalCapacity: stats.totalRU,
      used: stats.usedRU,
      available: Math.max(0, stats.totalRU - stats.usedRU),
      utilizationPct: stats.totalRU > 0 ? Math.round((stats.usedRU / stats.totalRU) * 100) : 0
    }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);
}

// Calculate top 10 utilized racks
async function calculateTopUtilizedRacks(supabase: any, servers: any[]): Promise<any[]> {
  // Group servers by rack
  const rackUsage: Record<string, { dc: string; servers: number; usedRU: number }> = {};
  
  servers.forEach(server => {
    const dc = server.dc_site || 'Unknown';
    const rack = server.rack || 'Unknown';
    const rackKey = `${dc}-${rack}`;
    
    // Debug logging to see actual data
    if (rackUsage && Object.keys(rackUsage).length < 5) {
      console.log(`Server data - DC: "${dc}", Rack: "${rack}", RackKey: "${rackKey}"`);
    }
    
    if (!rackUsage[rackKey]) {
      rackUsage[rackKey] = { dc, servers: 0, usedRU: 0 };
    }
    rackUsage[rackKey].servers++;
    rackUsage[rackKey].usedRU += server.unit_height || 1;
  });

  // Fetch rack metadata for capacity
  const { data: rackData, error } = await supabase
    .from('rack_metadata')
    .select('data_center, rack_id, total_ru');

  if (error) {
    console.error('Error fetching rack metadata:', error);
  }

  const rackCapacity: Record<string, number> = {};
  (rackData || []).forEach((rack: any) => {
    const rackKey = `${rack.data_center}-${rack.rack_id}`;
    rackCapacity[rackKey] = rack.total_ru || 42;
  });

  // Check if all servers are in the same data center
  const uniqueDCs = [...new Set(servers.map(server => server.dc_site || 'Unknown'))];
  const isSingleDC = uniqueDCs.length === 1;

  return Object.entries(rackUsage)
    .map(([rackKey, usage]) => {
      // Split rackKey and handle cases where rack might contain the DC name
      const parts = rackKey.split('-');
      let dc, rackId;
      
      if (parts.length === 2) {
        [dc, rackId] = parts;
      } else if (parts.length > 2) {
        // Handle cases like "DC EAST-R01" where DC has spaces
        dc = parts.slice(0, -1).join('-');
        rackId = parts[parts.length - 1];
      } else {
        dc = 'Unknown';
        rackId = rackKey;
      }
      
      // Debug logging
      console.log(`Processing rack: ${rackKey} -> DC: ${dc}, RackID: ${rackId}`);
      
      const capacity = rackCapacity[rackKey] || 42; // Default to 42U if no metadata
      const utilizationPct = Math.min(100, Math.round((usage.usedRU / capacity) * 100));
      
      return {
        // Create more meaningful rack names - add index if all racks have same name
        rack: isSingleDC && rackId === 'East' ? `Rack ${Object.keys(rackUsage).indexOf(rackKey) + 1}` :
              isSingleDC ? rackId : 
              `${dc} - ${rackId}`,
        dataCenter: dc,
        rackId: rackId,
        servers: usage.servers,
        used: usage.usedRU,
        capacity,
        utilizationPct
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct)
    .slice(0, 10);
}

// Calculate device type distribution by location
function calculateDeviceTypeByLocation(servers: any[]): any[] {
  const locationDeviceTypes: Record<string, Record<string, number>> = {};
  
  servers.forEach(server => {
    const location = server.dc_site || 'Unknown';
    const deviceType = server.device_type || 'Other';
    
    if (!locationDeviceTypes[location]) {
      locationDeviceTypes[location] = {};
    }
    locationDeviceTypes[location][deviceType] = (locationDeviceTypes[location][deviceType] || 0) + 1;
  });

  return Object.entries(locationDeviceTypes)
    .map(([location, types]) => ({
      location,
      ...types
    }));
}

// Calculate maintenance activity by location
function calculateMaintenanceByLocation(servers: any[]): any[] {
  const locationCounts: Record<string, { maintenance: number; active: number; other: number }> = {};
  
  servers.forEach(server => {
    const location = server.dc_site || 'Unknown';
    if (!locationCounts[location]) {
      locationCounts[location] = { maintenance: 0, active: 0, other: 0 };
    }
    
    const status = server.status || 'Unknown';
    if (status === 'Maintenance') {
      locationCounts[location].maintenance++;
    } else if (status === 'Active') {
      locationCounts[location].active++;
    } else {
      locationCounts[location].other++;
    }
  });

  return Object.entries(locationCounts)
    .map(([location, counts]) => ({
      location,
      maintenance: counts.maintenance,
      active: counts.active,
      other: counts.other,
      total: counts.maintenance + counts.active + counts.other
    }))
    .sort((a, b) => b.total - a.total);
}

// Calculate maintenance activity by model
function calculateMaintenanceByModel(servers: any[]): any[] {
  const modelCounts: Record<string, { maintenance: number; total: number }> = {};
  
  servers.forEach(server => {
    const model = server.model || 'Unknown';
    if (!modelCounts[model]) {
      modelCounts[model] = { maintenance: 0, total: 0 };
    }
    
    modelCounts[model].total++;
    if (server.status === 'Maintenance') {
      modelCounts[model].maintenance++;
    }
  });

  return Object.entries(modelCounts)
    .map(([model, counts]) => ({
      model,
      maintenance: counts.maintenance,
      total: counts.total,
      maintenancePct: Math.round((counts.maintenance / counts.total) * 100)
    }))
    .filter(item => item.maintenance > 0)
    .sort((a, b) => b.maintenance - a.maintenance)
    .slice(0, 10);
}

// Calculate maintenance vs active servers
function calculateMaintenanceVsActive(servers: any[]): any[] {
  const statusCounts: Record<string, number> = {};
  
  servers.forEach(server => {
    const status = server.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const colors: Record<string, string> = {
    'Active': '#10b981',
    'Maintenance': '#f59e0b',
    'Decommissioned': '#ef4444',
    'Unknown': '#6b7280',
    'Inactive': '#94a3b8',
    'Retired': '#64748b'
  };

  return Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      count,
      fill: colors[status] || '#6b7280'
    }))
    .sort((a, b) => b.count - a.count);
}

serve(handler);
