import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Server, Database, Settings, ArrowUp, ArrowDown, LayoutDashboard, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import DashboardBuilder from "./dashboard/DashboardBuilder";

const mockData = {
  totalServers: 1247,
  activeServers: 1189,
  maintenanceServers: 31,
  offlineServers: 27,
  warrantyExpiringSoon: 15,
  dataCenters: 4,
  racks: 156,
  utilization: 78
};

const serversByModel = [
  { name: "Dell R740", count: 245, color: "#3b82f6" },
  { name: "HPE DL380", count: 198, color: "#8b5cf6" },
  { name: "Dell R640", count: 167, color: "#10b981" },
  { name: "HPE DL360", count: 134, color: "#f59e0b" },
  { name: "Supermicro", count: 89, color: "#ef4444" },
  { name: "Others", count: 414, color: "#6b7280" }
];

const serversByLocation = [
  { location: "DC-East", servers: 342 },
  { location: "DC-West", servers: 298 },
  { location: "DC-Central", servers: 367 },
  { location: "DC-North", servers: 240 }
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

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
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Infrastructure Overview</h2>
            <p className="text-blue-100">Real-time monitoring of your data center assets</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Servers</CardTitle>
                <Server className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{mockData.totalServers}</div>
                <div className="flex items-center space-x-2 text-xs text-green-600 mt-1">
                  <ArrowUp className="h-3 w-3" />
                  <span>+12 this week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Servers</CardTitle>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Online</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{mockData.activeServers}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {((mockData.activeServers / mockData.totalServers) * 100).toFixed(1)}% operational
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Maintenance</CardTitle>
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Scheduled</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{mockData.maintenanceServers}</div>
                <div className="text-xs text-slate-500 mt-1">Requires attention</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Capacity</CardTitle>
                <Database className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{mockData.utilization}%</div>
                <Progress value={mockData.utilization} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Models Distribution */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Server Models</CardTitle>
                <CardDescription>Distribution by hardware type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serversByModel}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {serversByModel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Servers by Location */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Servers by Location</CardTitle>
                <CardDescription>Distribution across data centers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serversByLocation}>
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
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">System Alerts</CardTitle>
              <CardDescription>Critical notifications and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-red-900">Warranty Expiration Alert</p>
                    <p className="text-sm text-red-700">{mockData.warrantyExpiringSoon} servers have warranties expiring within 30 days</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-yellow-900">Maintenance Due</p>
                    <p className="text-sm text-yellow-700">Scheduled maintenance for Rack A-12 in DC-East tomorrow at 2:00 AM</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-blue-900">System Update</p>
                    <p className="text-sm text-blue-700">New server inventory added to DC-Central - 8 Dell R750 units</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <DashboardBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
