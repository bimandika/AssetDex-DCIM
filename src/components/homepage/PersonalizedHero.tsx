import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomepageMetrics } from '@/hooks/useHomepageMetrics';

interface PersonalizedHeroProps {
  user: {
    full_name?: string | null;
    username: string;
    email?: string;
  };
  metrics: HomepageMetrics | null;
  loading: boolean;
  onRefresh: () => void;
}

export const PersonalizedHero: React.FC<PersonalizedHeroProps> = ({ 
  user, 
  metrics, 
  loading, 
  onRefresh 
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getSystemStatusMessage = () => {
    if (!metrics) return "Loading system status...";
    
    switch (metrics.systemStatus) {
      case 'healthy':
        return "Your data center is running smoothly";
      case 'warning':
        return "Your data center needs attention";
      case 'critical':
        return "Your data center requires immediate attention";
      default:
        return "System status unknown";
    }
  };

  const getStatusColor = () => {
    if (!metrics) return "bg-gray-400";
    
    switch (metrics.systemStatus) {
      case 'healthy':
        return "bg-green-400";
      case 'warning':
        return "bg-yellow-400";
      case 'critical':
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  const formatLastUpdated = () => {
    if (!metrics?.lastUpdated) return "";
    
    const lastUpdate = new Date(metrics.lastUpdated);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just updated";
    if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    
    return `Updated ${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold">
                {getGreeting()}, {user.full_name || user.username}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="text-blue-100 hover:text-white hover:bg-blue-600/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <p className="text-blue-100 text-lg mb-4">
              {getSystemStatusMessage()}
            </p>
            
            {metrics && (
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${getStatusColor()} rounded-full`}></div>
                  <span>{metrics.activeServers} servers online</span>
                </div>
                
                {metrics.offlineServers > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>{metrics.offlineServers} offline</span>
                  </div>
                )}
                
                {metrics.warrantyExpiring > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>{metrics.warrantyExpiring} warranty alerts</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{formatLastUpdated()}</span>
                </div>
              </div>
            )}
          </div>
          
          {metrics && (
            <div className="text-right ml-6">
              <div className="text-3xl font-bold">
                {metrics.capacityUtilization}%
              </div>
              <div className="text-blue-200 text-sm">
                Capacity Used
              </div>
              <Badge 
                variant="secondary" 
                className={`mt-2 ${
                  metrics.systemStatus === 'healthy' 
                    ? 'bg-green-100 text-green-700' 
                    : metrics.systemStatus === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {metrics.systemStatus.charAt(0).toUpperCase() + metrics.systemStatus.slice(1)}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
