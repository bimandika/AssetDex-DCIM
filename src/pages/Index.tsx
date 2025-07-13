
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, Database, LayoutDashboard, Settings, Filter, Users } from "lucide-react";
import ServerInventory from "@/components/ServerInventory";
import Dashboard from "@/components/Dashboard";
import RackView from "@/components/RackView";
import Reports from "@/components/Reports";
import ServerProperties from "@/components/ServerProperties";
import DataCenterView from "@/components/DataCenterView";
import UserManagement from "@/components/UserManagement";
import UserMenu from "@/components/UserMenu";
import SettingsDialog from "@/components/SettingsDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("DCIMS");
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const { hasRole } = useAuth();
  const { toast } = useToast();

  // Check if user has write permissions (engineer or super_admin)
  const canWrite = hasRole('engineer');
  const isAdmin = hasRole('super_admin');

  useEffect(() => {
    // Load organization name from localStorage
    const savedName = localStorage.getItem('organizationName');
    if (savedName) {
      setOrganizationName(savedName);
    }

    // Check if custom logo exists
    const checkLogoExists = () => {
      const img = document.createElement('img');
      img.onload = () => setHasCustomLogo(true);
      img.onerror = () => setHasCustomLogo(false);
      img.src = '/logo.png?' + Date.now();
    };
    checkLogoExists();
  }, []);

  const handleLogoUpdate = () => {
    // Refresh logo check and organization name
    const savedName = localStorage.getItem('organizationName');
    if (savedName) {
      setOrganizationName(savedName);
    }
    
    const img = document.createElement('img');
    img.onload = () => setHasCustomLogo(true);
    img.onerror = () => setHasCustomLogo(false);
    img.src = '/logo.png?' + Date.now();
  };

  const handleViewRack = (rackId: string) => {
    setSelectedRackId(rackId);
    setActiveTab("rackview");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasCustomLogo ? (
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                  <img
                    src={'/logo.png?' + Date.now()}
                    alt="Organization Logo"
                    className="h-8 w-8 object-contain"
                    onError={() => setHasCustomLogo(false)}
                  />
                </div>
              ) : (
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {organizationName}
                </h1>
                <p className="text-sm text-slate-600">Data Center Inventory Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                System Online
              </Badge>
              <SettingsDialog onLogoUpdate={handleLogoUpdate}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </SettingsDialog>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'} lg:w-[${isAdmin ? '700px' : '600px'}] bg-white border border-slate-200 shadow-sm`}>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="rackview" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Rack View</span>
            </TabsTrigger>
            <TabsTrigger value="datacenter" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">DC View</span>
            </TabsTrigger>
            {/* Only show Properties tab to engineers and super admins */}
            {canWrite && (
              <TabsTrigger value="properties" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Properties</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            {/* Only show User Management tab to super admins */}
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <ServerInventory />
          </TabsContent>

          <TabsContent value="rackview" className="space-y-6">
            <RackView selectedRackId={selectedRackId} />
          </TabsContent>

          <TabsContent value="datacenter" className="space-y-6">
            <DataCenterView onViewRack={handleViewRack} />
          </TabsContent>

          {canWrite && (
            <TabsContent value="properties" className="space-y-6">
              <ServerProperties />
            </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-6">
            <Reports />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
