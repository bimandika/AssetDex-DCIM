
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, ArrowDown, Database, Server, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const mockReportData = {
  serversByModel: [
    { model: "Dell R740", count: 245, percentage: 19.6 },
    { model: "HPE DL380", count: 198, percentage: 15.9 },
    { model: "Dell R640", count: 167, percentage: 13.4 },
    { model: "HPE DL360", count: 134, percentage: 10.7 },
    { model: "Supermicro", count: 89, percentage: 7.1 }
  ],
  serversByStatus: [
    { status: "Active", count: 1189, color: "#10b981" },
    { status: "Maintenance", count: 31, color: "#f59e0b" },
    { status: "Offline", count: 27, color: "#ef4444" }
  ],
  warrantyExpiration: [
    { month: "Jan 2024", expiring: 12 },
    { month: "Feb 2024", expiring: 8 },
    { month: "Mar 2024", expiring: 15 },
    { month: "Apr 2024", expiring: 23 },
    { month: "May 2024", expiring: 18 },
    { month: "Jun 2024", expiring: 31 }
  ],
  utilizationByDataCenter: [
    { dataCenter: "DC-East", utilization: 78, servers: 342 },
    { dataCenter: "DC-West", utilization: 65, servers: 298 },
    { dataCenter: "DC-Central", utilization: 82, servers: 367 },
    { dataCenter: "DC-North", utilization: 71, servers: 240 }
  ]
};

const Reports = () => {
  const [reportType, setReportType] = useState("inventory");
  const [selectedDataCenter, setSelectedDataCenter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [exportFormat, setExportFormat] = useState("csv");

  const handleExportReport = () => {
    console.log(`Exporting ${reportType} report as ${exportFormat} for last ${dateRange} days`);
    // Implementation for report export would go here
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-600">Generate custom reports and analyze your infrastructure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button onClick={handleExportReport}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Report Configuration</CardTitle>
          <CardDescription>Customize your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Summary</SelectItem>
                  <SelectItem value="warranty">Warranty Report</SelectItem>
                  <SelectItem value="utilization">Utilization Report</SelectItem>
                  <SelectItem value="maintenance">Maintenance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataCenter">Data Center</Label>
              <Select value={selectedDataCenter} onValueChange={setSelectedDataCenter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data Centers</SelectItem>
                  <SelectItem value="DC-East">DC-East</SelectItem>
                  <SelectItem value="DC-West">DC-West</SelectItem>
                  <SelectItem value="DC-Central">DC-Central</SelectItem>
                  <SelectItem value="DC-North">DC-North</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[200px] bg-white border border-slate-200 shadow-sm">
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Models Chart */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  <span>Servers by Model</span>
                </CardTitle>
                <CardDescription>Distribution of server hardware</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockReportData.serversByModel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="model" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }} 
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Server Status Pie Chart */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <span>Server Status</span>
                </CardTitle>
                <CardDescription>Current operational status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockReportData.serversByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {mockReportData.serversByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Warranty Expiration Timeline */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Warranty Expiration Timeline</CardTitle>
                <CardDescription>Servers with expiring warranties</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockReportData.warrantyExpiration}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expiring" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Data Center Utilization */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <span>Data Center Utilization</span>
                </CardTitle>
                <CardDescription>Capacity utilization by location</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockReportData.utilizationByDataCenter}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dataCenter" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }} 
                    />
                    <Bar dataKey="utilization" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          {/* Server Model Summary Table */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Server Model Summary</CardTitle>
              <CardDescription>Detailed breakdown by server model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockReportData.serversByModel.map((item) => (
                      <TableRow key={item.model}>
                        <TableCell className="font-medium">{item.model}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">{item.percentage}%</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            In Production
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Data Center Utilization Table */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Data Center Utilization</CardTitle>
              <CardDescription>Capacity and utilization metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Center</TableHead>
                      <TableHead className="text-right">Total Servers</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockReportData.utilizationByDataCenter.map((item) => (
                      <TableRow key={item.dataCenter}>
                        <TableCell className="font-medium">{item.dataCenter}</TableCell>
                        <TableCell className="text-right">{item.servers}</TableCell>
                        <TableCell className="text-right">{item.utilization}%</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              item.utilization > 80 
                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                : item.utilization > 60
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                : "bg-green-100 text-green-700 hover:bg-green-100"
                            }
                          >
                            {item.utilization > 80 ? "High" : item.utilization > 60 ? "Medium" : "Normal"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
