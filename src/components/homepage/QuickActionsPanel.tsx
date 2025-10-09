import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Zap, 
  FileText, 
  Calendar, 
  Users,
  Database,
  Settings,
  Activity
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  category: 'primary' | 'secondary';
  color: string;
}

interface QuickActionsPanelProps {
  userRole: string;
  onActionClick: (actionId: string) => void;
}

const quickActions: QuickAction[] = [
  {
    id: 'add-server',
    title: 'Add New Server',
    description: 'Register a new server',
    icon: Plus,
    roles: ['engineer', 'super_admin'],
    category: 'primary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'check-racks',
    title: 'Check Rack Space',
    description: 'Find available positions',
    icon: Search,
    roles: ['viewer', 'engineer', 'super_admin'],
    category: 'primary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'power-monitor',
    title: 'Monitor Power',
    description: 'View power consumption',
    icon: Zap,
    roles: ['viewer', 'engineer', 'super_admin'],
    category: 'primary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'generate-report',
    title: 'Generate Report',
    description: 'Create system report',
    icon: FileText,
    roles: ['engineer', 'super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'schedule-maintenance',
    title: 'Schedule Maintenance',
    description: 'Plan maintenance tasks',
    icon: Calendar,
    roles: ['engineer', 'super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'view-room-layout',
    title: 'View Room Layout',
    description: 'Browse data center layout',
    icon: Database,
    roles: ['viewer', 'engineer', 'super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'user-management',
    title: 'Manage Users',
    description: 'User administration',
    icon: Users,
    roles: ['super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'system-settings',
    title: 'System Settings',
    description: 'Configure system',
    icon: Settings,
    roles: ['super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'view-activity',
    title: 'Activity Logs',
    description: 'View recent changes',
    icon: Activity,
    roles: ['super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  },
  {
    id: 'log-manual-activity',
    title: 'Add Activity',
    description: 'Record maintenance or visits',
    icon: Plus,
    roles: ['engineer', 'super_admin'],
    category: 'secondary',
    color: 'hover:bg-slate-50 border-slate-200'
  }
];

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ 
  userRole, 
  onActionClick 
}) => {
  const availableActions = quickActions.filter(action => 
    action.roles.includes(userRole)
  );

  const primaryActions = availableActions.filter(action => action.category === 'primary');
  const secondaryActions = availableActions.filter(action => action.category === 'secondary');

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts for your role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Actions - Icon-focused design */}
        {primaryActions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Main Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {primaryActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className={`h-20 p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-200 hover:shadow-md ${action.color}`}
                  onClick={() => onActionClick(action.id)}
                >
                  <action.icon className="h-8 w-8 text-slate-600" />
                  <div className="text-center">
                    <div className="font-medium text-sm text-slate-900">{action.title}</div>
                    <div className="text-xs text-slate-500">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Actions - Compact with larger icons */}
        {secondaryActions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Additional Tools
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {secondaryActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className={`h-18 p-3 flex flex-col items-center justify-center space-y-1 transition-all duration-200 hover:shadow-sm ${action.color}`}
                  onClick={() => onActionClick(action.id)}
                >
                  <action.icon className="h-6 w-6 text-slate-600" />
                  <div className="text-center">
                    <div className="font-medium text-xs text-slate-900">{action.title}</div>
                    <div className="text-xs text-slate-500 hidden sm:block">
                      {action.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {availableActions.length === 0 && (
          <div className="text-center py-6 text-slate-500">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No quick actions available for your role</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
