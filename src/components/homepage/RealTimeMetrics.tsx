import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Database,
  ArrowUp,
  TrendingUp
} from 'lucide-react';
import type { HomepageMetrics } from '@/hooks/useHomepageMetrics';

interface RealTimeMetricsProps {
  metrics: HomepageMetrics | null;
  loading: boolean;
  userRole: string;
  onActionClick: (action: string) => void;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ 
  metrics, 
  loading, 
  userRole,
  onActionClick 
}) => {
  const canWrite = ['engineer', 'super_admin'].includes(userRole);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getServerStatusColor = () => {
    const percentage = (metrics.activeServers / metrics.totalServers) * 100;
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Servers */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Server Inventory
          </CardTitle>
          <Server className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.totalServers}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 text-xs text-green-600">
              {metrics.recentAdditions > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3" />
                  <span>+{metrics.recentAdditions} this week</span>
                </>
              ) : (
                <span className="text-slate-500">No recent additions</span>
              )}
            </div>
            {canWrite && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onActionClick('add-server')}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Servers */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Active Servers
          </CardTitle>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Online
          </Badge>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getServerStatusColor()}`}>
            {metrics.activeServers}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-slate-500">
              {metrics.totalServers > 0 
                ? `${((metrics.activeServers / metrics.totalServers) * 100).toFixed(1)}% operational`
                : '0% operational'
              }
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onActionClick('view-servers')}
              className="h-6 px-2 text-xs"
            >
              View All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance & Issues */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Needs Attention
          </CardTitle>
          {(metrics.maintenanceServers + metrics.offlineServers) > 0 ? (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Issues
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              Good
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.maintenanceServers + metrics.offlineServers}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-slate-500">
              {metrics.maintenanceServers > 0 && `${metrics.maintenanceServers} maintenance`}
              {metrics.maintenanceServers > 0 && metrics.offlineServers > 0 && ', '}
              {metrics.offlineServers > 0 && `${metrics.offlineServers} offline`}
              {metrics.maintenanceServers === 0 && metrics.offlineServers === 0 && 'All systems good'}
            </div>
            {(metrics.maintenanceServers + metrics.offlineServers) > 0 && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onActionClick('view-issues')}
                className="h-6 px-2 text-xs"
              >
                Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Alerts */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            System Health
          </CardTitle>
          <Database className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 mb-2">
            {metrics.capacityUtilization}%
          </div>
          <Progress 
            value={metrics.capacityUtilization} 
            className="h-2 mb-2"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {metrics.warrantyExpiring > 0 
                ? `${metrics.warrantyExpiring} warranty alerts`
                : 'No warranty issues'
              }
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onActionClick('view-capacity')}
              className="h-6 px-2 text-xs"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Monitor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
