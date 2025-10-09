import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import CustomDashboard from "./dashboard/CustomDashboard";
import { PersonalizedHero } from "./homepage/PersonalizedHero";
import { RealTimeMetrics } from "./homepage/RealTimeMetrics";
import { QuickActionsPanel } from "./homepage/QuickActionsPanel";
import { LiveAlerts } from "./homepage/LiveAlerts";
import { ManualActivityDialog } from "./ManualActivityDialog";
import { useHomepageMetrics } from "@/hooks/useHomepageMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { metrics, chartData, alerts, loading, error, refresh } = useHomepageMetrics();

  const userRole = hasRole('super_admin') ? 'super_admin' : hasRole('engineer') ? 'engineer' : 'viewer';

  const handleActionClick = (actionId: string, url?: string) => {
    switch (actionId) {
      case 'add-server':
        navigate('/servers');
        toast({
          title: 'Navigation',
          description: 'Opening server inventory to add new server',
        });
        break;
      case 'check-racks':
        navigate('/rackview');
        break;
      case 'power-monitor':
        navigate('/power-usage');
        break;
      case 'generate-report':
        navigate('/reports');
        break;
      case 'schedule-maintenance':
        toast({
          title: 'Feature Coming Soon',
          description: 'Maintenance scheduling will be available soon',
        });
        break;
      case 'view-room-layout':
        navigate('/roomview');
        break;
      case 'user-management':
        navigate('/users');
        break;
      case 'system-settings':
        toast({
          title: 'Settings',
          description: 'Opening system settings',
        });
        break;
      case 'view-activity':
        navigate('/activitylogs');
        break;
      case 'view-servers':
        navigate('/servers');
        break;
      case 'view-issues':
        navigate('/servers?filter=status:Maintenance,Offline');
        break;
      case 'view-capacity':
        navigate('/rackview');
        break;
      case 'view-all-alerts':
        toast({
          title: 'Alerts',
          description: 'Comprehensive alerts view coming soon',
        });
        break;
      case 'log-manual-activity':
        setShowActivityDialog(true);
        break;
      default:
        if (url) {
          navigate(url);
        } else {
          toast({
            title: 'Action',
            description: `${actionId} functionality is being developed`,
          });
        }
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-800 font-medium">Failed to load dashboard data</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Custom Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Personalized Welcome Section */}
          <PersonalizedHero 
            user={{
              full_name: user?.user_metadata?.full_name,
              username: user?.email?.split('@')[0] || 'User',
              email: user?.email
            }}
            metrics={metrics}
            loading={loading}
            onRefresh={refresh}
          />

          {/* Real-Time Metrics */}
          <RealTimeMetrics 
            metrics={metrics}
            loading={loading}
            userRole={userRole}
            onActionClick={handleActionClick}
          />

          {/* Quick Actions Panel */}
          <QuickActionsPanel 
            userRole={userRole}
            onActionClick={handleActionClick}
          />

          {/* Live Alerts */}
          <LiveAlerts 
            alerts={alerts}
            loading={loading}
            onActionClick={handleActionClick}
          />

          {/* Charts Section - Enhanced with real data context */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Models Distribution */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Server Models</CardTitle>
                <CardDescription>Distribution by hardware type {metrics && `(Total: ${metrics.totalServers})`}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : chartData && chartData.serversByModel.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.serversByModel}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ name, count }) => `${name}: ${count}`}
                      >
                        {chartData.serversByModel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <p className="text-sm">No server model data available</p>
                      <p className="text-xs mt-1">Add servers to see distribution</p>
                    </div>
                  </div>
                )}
                {metrics && (
                  <div className="mt-2 text-center">
                    <Badge variant="outline" className="text-xs">
                      Data reflects {metrics.totalServers} servers in your inventory
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Servers by Location */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Servers by Location</CardTitle>
                <CardDescription>Distribution across data centers</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : chartData && chartData.serversByLocation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.serversByLocation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="location" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }} 
                      />
                      <Bar dataKey="servers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <p className="text-sm">No location data available</p>
                      <p className="text-xs mt-1">Add servers with location info to see distribution</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomDashboard />
        </TabsContent>
      </Tabs>

      {/* Manual Activity Dialog */}
      <ManualActivityDialog 
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
      />
    </div>
  );
};

export default Dashboard;
