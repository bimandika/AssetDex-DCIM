import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Clock,
  Server,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { HomepageAlert } from '@/hooks/useHomepageMetrics';

interface LiveAlertsProps {
  alerts: HomepageAlert[];
  loading: boolean;
  onActionClick: (actionId: string, url?: string) => void;
}

export const LiveAlerts: React.FC<LiveAlertsProps> = ({ 
  alerts, 
  loading, 
  onActionClick 
}) => {
  const getSeverityColor = (severity: HomepageAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getSeverityDotColor = (severity: HomepageAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: HomepageAlert['type']) => {
    switch (type) {
      case 'warranty':
        return <Shield className="h-3 w-3" />;
      case 'system':
        return <Server className="h-3 w-3" />;
      case 'capacity':
        return <AlertTriangle className="h-3 w-3" />;
      case 'maintenance':
        return <Clock className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Live Alerts & Notifications
          </CardTitle>
          <CardDescription>
            Real-time system alerts and warnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-300 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-48 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Live Alerts & Notifications
            </CardTitle>
            <CardDescription>
              Real-time system alerts and warnings
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {alerts.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Info className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">
              All Clear!
            </h3>
            <p className="text-sm text-slate-500">
              No active alerts or warnings at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-start space-x-3 p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className={`w-2 h-2 ${getSeverityDotColor(alert.severity)} rounded-full mt-2 flex-shrink-0`}></div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getTypeIcon(alert.type)}
                        <p className="font-medium text-sm">
                          {alert.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-90">
                        {alert.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-xs opacity-75">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    {alert.actionable && alert.action_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onActionClick(alert.id, alert.action_url)}
                        className="flex-shrink-0 h-8 px-3 text-xs hover:bg-white/50"
                      >
                        {alert.action_label || 'View'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {alerts.length >= 5 && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onActionClick('view-all-alerts')}
                  className="text-xs"
                >
                  View All Alerts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
