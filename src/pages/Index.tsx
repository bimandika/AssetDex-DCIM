import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Server, Database, LayoutDashboard, Settings, Filter, Users, Zap } from "lucide-react";
import ServerInventory from "@/components/ServerInventory";
import Dashboard from "@/components/Dashboard";
import RackView from "@/components/RackView";
import RoomView from "@/components/RoomView";
import Reports from "@/components/Reports";
import ServerProperties from "@/components/ServerProperties";
import PowerUsage from "@/components/PowerUsage";
import UserManagement from "@/components/UserManagement";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { checkLogoExists, getCurrentLogoUrl, initializeLogoSystem, getOrganizationNameSync, initializeOrgNameSystem } from "@/utils/fileUpload";
import ActivityLogsViewer from "@/components/admin/ActivityLogsViewer";
import DeviceGlossaryList from "@/components/device-glossary/DeviceGlossaryList";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Tab mapping for URL paths
  const pathToTab: Record<string, string> = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/serverinventory': 'servers',
    '/servers': 'servers',
    '/rackview': 'rackview',
    '/racks': 'rackview',
    '/roomview': 'roomview',
    '/rooms': 'roomview',
    '/datacenter': 'powerusage',
    '/power-usage': 'powerusage',
    '/power': 'powerusage',
    '/reports': 'reports',
    '/properties': 'properties',
    '/users': 'users',
    '/usermanagement': 'users',
    '/activitylogs': 'activitylogs',
    '/device-glossary': 'glossary'
  };

  const tabToPath: Record<string, string> = {
    'dashboard': '/',
    'servers': '/serverinventory',
    'rackview': '/rackview',
    'roomview': '/roomview',
    'powerusage': '/power-usage',
    'reports': '/reports',
    'properties': '/properties',
    'users': '/users',
    'activitylogs': '/activitylogs',
    'glossary': '/device-glossary'
  };

  // Determine active tab from URL
  const getActiveTabFromUrl = () => {
    return pathToTab[location.pathname] || 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl());
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("DCIMS");
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const { hasRole } = useAuth();

  // Sync activeTab with URL changes
  useEffect(() => {
    const newTab = getActiveTabFromUrl();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]);

  // Handle tab change - update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newPath = tabToPath[newTab] || '/';
    if (location.pathname !== newPath) {
      navigate(newPath, { replace: true });
    }
  };

  // Check if user has write permissions (engineer or super_admin)
  const canWrite = hasRole('engineer');
  const isAdmin = hasRole('super_admin');

  useEffect(() => {
    // Initialize organization name system
    const initializeOrgName = async () => {
      const initializedOrgName = await initializeOrgNameSystem();
      setOrganizationName(initializedOrgName);
    };
    initializeOrgName();

    // Check for custom logo on component mount
    const checkCustomLogo = async () => {
      console.log('🚀 Index.tsx - Starting logo check...');
      
      // Log current localStorage state
      const logoUrl = localStorage.getItem('organization-logo-url');
      console.log('📦 localStorage logo URL:', logoUrl);
      
      // Use the new initialization system
      const exists = await initializeLogoSystem();
      console.log('🔍 Logo exists result:', exists);
      
      setHasCustomLogo(exists);
    };
    checkCustomLogo();

    // Listen for logo updates from SettingsDialog
    const handleLogoUpdated = async () => {
      const exists = await checkLogoExists();
      setHasCustomLogo(exists);
      
      // Also refresh organization name
      const savedName = getOrganizationNameSync();
      if (savedName) {
        setOrganizationName(savedName);
      }
    };

    // Listen for custom logo update events
    window.addEventListener('logoUpdated', handleLogoUpdated);
    window.addEventListener('storage', handleLogoUpdated);
    window.addEventListener('forceLogoUpdate', handleLogoUpdated);

    // Listen for organization name update events
    const handleOrgNameUpdated = () => {
      const savedName = getOrganizationNameSync();
      if (savedName) {
        setOrganizationName(savedName);
      }
    };
    
    window.addEventListener('organizationNameUpdated', handleOrgNameUpdated);

    // Cleanup
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdated);
      window.removeEventListener('storage', handleLogoUpdated);
      window.removeEventListener('forceLogoUpdate', handleLogoUpdated);
      window.removeEventListener('organizationNameUpdated', handleOrgNameUpdated);
    };
  }, []);

  const handleViewRack = (rackId: string) => {
    setSelectedRackId(rackId);
    handleTabChange("rackview");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasCustomLogo ? (
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={getCurrentLogoUrl()}
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
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin && canWrite ? 'grid-cols-10' : isAdmin ? 'grid-cols-9' : canWrite ? 'grid-cols-8' : 'grid-cols-7'} lg:w-[${isAdmin && canWrite ? '1000px' : isAdmin ? '900px' : canWrite ? '800px' : '700px'}] bg-white border border-slate-200 shadow-sm`}>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="servers" className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="rackview" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Rack View</span>
            </TabsTrigger>
            <TabsTrigger value="roomview" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Room View</span>
            </TabsTrigger>
            <TabsTrigger value="powerusage" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Power Usage</span>
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
            {/* Only show Activity Logs tab to super admins */}
            {isAdmin && (
              <TabsTrigger value="activitylogs" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Activity Logs</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="glossary" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Glossary</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <ServerInventory />
          </TabsContent>

          <TabsContent value="rackview" className="space-y-6">
            <RackView selectedRackId={selectedRackId} />
          </TabsContent>

          <TabsContent value="roomview" className="space-y-6">
            <RoomView onRackClick={handleViewRack} />
          </TabsContent>

          <TabsContent value="powerusage" className="space-y-6">
            <PowerUsage onViewRack={handleViewRack} />
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

          {isAdmin && (
            <TabsContent value="activitylogs" className="space-y-6">
              <ActivityLogsViewer />
            </TabsContent>
          )}

          <TabsContent value="glossary" className="space-y-6">
            <DeviceGlossaryList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
