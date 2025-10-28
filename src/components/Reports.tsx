import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, ArrowDown, Database, Server, Settings, Loader2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useReportMetrics, type ActivityLogData } from "@/hooks/useReportMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportExporter } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { useServerEnums } from "@/hooks/useServerEnums";

const Reports = () => {
  const [reportType, setReportType] = useState<'inventory' | 'warranty' | 'utilization' | 'maintenance' | 'activity'>('inventory');
  const [selectedDataCenter, setSelectedDataCenter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | 'json'>('csv');
  const { toast } = useToast();
  const { enums } = useServerEnums();

  // Use the hook to fetch real data
  const { metrics, loading, error } = useReportMetrics({
    reportType,
    selectedDataCenter,
    dateRange
  });

  // Auto-save report parameters to localStorage every 5 seconds
  useEffect(() => {
    console.log('Reports: Filter state updated:', { reportType, selectedDataCenter, dateRange });
    const timer = setInterval(() => {
      localStorage.setItem('reports_state', JSON.stringify({
        reportType,
        selectedDataCenter,
        dateRange,
        exportFormat,
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, [reportType, selectedDataCenter, dateRange, exportFormat]);

  // Restore report parameters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reportParams');
    if (saved && saved !== "undefined") {
      try {
        const state = JSON.parse(saved);
        if (state.reportType) setReportType(state.reportType);
        if (state.selectedDataCenter) setSelectedDataCenter(state.selectedDataCenter);
        if (state.dateRange) setDateRange(state.dateRange);
        if (state.exportFormat) setExportFormat(state.exportFormat);
      } catch (e) {
        // Optionally log or ignore
      }
    }
  }, []);

  const handleExportReport = async () => {
    try {
      await ReportExporter.exportReport(metrics, reportType, exportFormat);
      toast({
        title: 'Export Successful',
        description: `Report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const handleExportAllCharts = async () => {
    try {
      await ReportExporter.exportAllCharts(reportType);
      toast({
        title: 'Charts Exported',
        description: 'All charts have been exported as an image',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export charts',
        variant: 'destructive',
      });
    }
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
          <Button variant="outline" onClick={handleExportAllCharts}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Export All Charts
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
                  <SelectItem value="activity">Activity Logs</SelectItem>
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
                  {enums?.sites?.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading report data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load report data: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Activity Logs Report */}
        {!loading && !error && reportType === 'activity' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalActivities || 0}</div>
                  <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.activityByUser?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">users with activity</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Action Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.activityByType?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">different actions</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Activity by Type - Pie Chart */}
              <Card className="bg-white border-0 shadow-sm" data-chart-id="activity-by-type">
                <CardHeader>
                  <CardTitle>Activity Distribution by Type</CardTitle>
                  <CardDescription>Breakdown of action types performed</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.activityByType || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Activity Data</p>
                        <p className="text-sm">No actions have been logged in this period</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={metrics?.activityByType || []}
                          dataKey="count"
                          nameKey="action_type"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry: any) => `${entry.action_type}: ${entry.count}`}
                        >
                          {(metrics?.activityByType || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={({ payload }: any) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                              <p className="font-bold">{data.action_type}</p>
                              <p>Count: {data.count}</p>
                              <p>Unique Users: {data.unique_users}</p>
                            </div>
                          );
                        }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Users by Activity - Bar Chart */}
              <Card className="bg-white border-0 shadow-sm" data-chart-id="activity-by-user">
                <CardHeader>
                  <CardTitle>Most Active Users</CardTitle>
                  <CardDescription>Top 10 users by number of actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.activityByUser || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No User Activity</p>
                        <p className="text-sm">No user actions have been recorded</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={(metrics?.activityByUser || []).slice(0, 10)}
                        margin={{ bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="user_email" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          interval={0}
                          fontSize={11}
                          stroke="#64748b"
                        />
                        <YAxis stroke="#64748b" />
                        <Tooltip content={({ payload }: any) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                              <p className="font-bold">{data.user_name || data.user_email}</p>
                              <p>Action: {data.action_type}</p>
                              <p>Count: {data.action_count}</p>
                            </div>
                          );
                        }} />
                        <Bar dataKey="action_count" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Table */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity Logs</CardTitle>
                <CardDescription>Latest 100 actions in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(metrics?.activityLogs || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                            No activity logs found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        (metrics?.activityLogs || []).map((log: ActivityLogData) => (
                          <TableRow key={log.id} className="hover:bg-muted/50">
                            <TableCell className="text-xs">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                {log.user_name && (
                                  <div className="font-medium text-sm">{log.user_name}</div>
                                )}
                                <div className="text-xs text-muted-foreground">{log.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                log.action_type === 'create' ? 'bg-green-100 text-green-800' :
                                log.action_type === 'update' ? 'bg-blue-100 text-blue-800' :
                                log.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                                log.action_type === 'login' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {log.action_type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.entity_type}</TableCell>
                            <TableCell className="font-mono text-xs">{log.entity_id}</TableCell>
                            <TableCell>
                              {log.changes && (
                                <details className="cursor-pointer">
                                  <summary className="text-xs text-blue-600 hover:underline">
                                    View changes
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md">
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Standard Reports (Inventory, Warranty, etc.) */}
        {!loading && !error && reportType !== 'activity' && (
        <>
        <TabsContent value="charts" className="space-y-6">
          {/* INVENTORY CHARTS */}
          {reportType === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Models */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-server-models">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  <span>Server Models</span>
                </CardTitle>
                <CardDescription>Distribution by hardware type (Total: {metrics?.totalServers || 0})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.serversByModel || []}
                      cx="35%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="model"
                      label={({ percent }: any) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {(metrics?.serversByModel || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      iconType="circle"
                      wrapperStyle={{ paddingLeft: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Type Distribution */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-device-type">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Server className="h-5 w-5 text-purple-600" />
                  <span>Device Type Distribution</span>
                </CardTitle>
                <CardDescription>Breakdown by device category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.deviceTypeDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="deviceType"
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {(metrics?.deviceTypeDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Servers by Brand */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-brand">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Server className="h-5 w-5 text-green-600" />
                  <span>Servers by Brand</span>
                </CardTitle>
                <CardDescription>Hardware vendor distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.serversByBrand || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="brand" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="count" name="Server Count" radius={[4, 4, 0, 0]}>
                      {(metrics?.serversByBrand || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Servers by Location (Datacenter) */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-location">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Database className="h-5 w-5 text-indigo-600" />
                  <span>Servers by Location</span>
                </CardTitle>
                <CardDescription>Server count per datacenter</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.serversByLocation || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="location" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="count" name="Server Count" radius={[4, 4, 0, 0]}>
                      {(metrics?.serversByLocation || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Operating System Distribution */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-os">
              <CardHeader>
                <CardTitle className="text-lg">Operating System Distribution</CardTitle>
                <CardDescription>OS deployment across servers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.operatingSystemDistribution || []}
                      cx="35%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="os"
                      label={({ percent }: any) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {(metrics?.operatingSystemDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      iconType="circle"
                      wrapperStyle={{ paddingLeft: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Allocation Type Distribution */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-allocation">
              <CardHeader>
                <CardTitle className="text-lg">Allocation Type Distribution</CardTitle>
                <CardDescription>Service allocation categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.allocationTypeDistribution || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="allocation" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="count" name="Server Count" radius={[4, 4, 0, 0]}>
                      {(metrics?.allocationTypeDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Environment Distribution */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-environment">
              <CardHeader>
                <CardTitle className="text-lg">Environment Distribution</CardTitle>
                <CardDescription>Production, testing, development split</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.environmentDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="environment"
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {(metrics?.environmentDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Server Status */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="inventory-status">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <span>Server Status</span>
                </CardTitle>
                <CardDescription>Current operational status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.serversByStatus || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="status"
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {(metrics?.serversByStatus || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          )}

          {/* WARRANTY CHARTS */}
          {reportType === 'warranty' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Warranty Status */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="warranty-status">
              <CardHeader>
                <CardTitle className="text-lg">Warranty Status Overview</CardTitle>
                <CardDescription>Current warranty status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.warrantyStatus || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="status"
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {(metrics?.warrantyStatus || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Warranty Expiration Timeline */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="warranty-timeline">
              <CardHeader>
                <CardTitle className="text-lg">Warranty Expiration Timeline</CardTitle>
                <CardDescription>Servers with expiring warranties (next 12 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart 
                    data={metrics?.warrantyExpiration || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="expiring"
                      name="Expiring Warranties" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Servers Needing Renewal */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="warranty-renewal">
              <CardHeader>
                <CardTitle className="text-lg">Servers Needing Renewal</CardTitle>
                <CardDescription>Warranty renewals needed in next 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.serversNeedingRenewal || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="count" name="Servers Expiring" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Warranty Coverage by Brand */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="warranty-coverage">
              <CardHeader>
                <CardTitle className="text-lg">Warranty Coverage by Brand</CardTitle>
                <CardDescription>Active vs expired warranties per vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.warrantyCoverageByBrand || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="brand" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="active" name="Active" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="expired" name="Expired" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="none" name="No Warranty" fill="#6b7280" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          )}

          {/* UTILIZATION CHARTS */}
          {reportType === 'utilization' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Center Utilization */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="utilization-dc">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <span>Data Center Server Count</span>
                </CardTitle>
                <CardDescription>Server distribution by location</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.utilizationByDataCenter || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dataCenter" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="servers" name="Server Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rack Capacity by Datacenter */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="utilization-rack-capacity">
              <CardHeader>
                <CardTitle className="text-lg">Rack Capacity by Datacenter</CardTitle>
                <CardDescription>Space utilization across locations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.rackCapacityByDC || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dataCenter" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="used" name="Used RU" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="available" name="Available RU" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top 10 Utilized Racks */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="utilization-top-racks">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Utilized Racks</CardTitle>
                <CardDescription>Racks with highest capacity usage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.topUtilizedRacks || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="rack" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Utilization %') return [`${value}%`, name];
                        return [value, name];
                      }}
                      labelFormatter={(label: string) => `Rack: ${label}`}
                      content={({ payload }: any) => {
                        if (!payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-bold">{data.rack}</p>
                            <p>Servers: {data.servers}</p>
                            <p>Used: {data.used} RU</p>
                            <p>Capacity: {data.capacity} RU</p>
                            <p className="font-semibold">Utilization: {data.utilizationPct}%</p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="utilizationPct" name="Utilization %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Type by Location (stacked) */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="utilization-device-location">
              <CardHeader>
                <CardTitle className="text-lg">Device Type by Location</CardTitle>
                <CardDescription>Hardware distribution across datacenters</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.deviceTypeByLocation || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="location" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="Server" name="Server" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Storage" name="Storage" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Network" name="Network" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          )}

          {/* MAINTENANCE CHARTS */}
          {reportType === 'maintenance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance vs Active */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="maintenance-status">
              <CardHeader>
                <CardTitle className="text-lg">Server Status Overview</CardTitle>
                <CardDescription>All servers by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={metrics?.maintenanceVsActive || []}
                      cx="35%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="status"
                      label={({ percent }: any) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {(metrics?.maintenanceVsActive || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      iconType="circle"
                      wrapperStyle={{ paddingLeft: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Maintenance by Location */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="maintenance-location">
              <CardHeader>
                <CardTitle className="text-lg">Maintenance by Location</CardTitle>
                <CardDescription>Server status breakdown per datacenter</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={metrics?.maintenanceByLocation || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="location" 
                      stroke="#64748b" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                    <Bar dataKey="active" name="Active" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="maintenance" name="Maintenance" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="other" name="Other Status" fill="#6b7280" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Maintenance by Model (Top 10) */}
            <Card className="bg-white border-0 shadow-sm" data-chart-id="maintenance-models">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Models in Maintenance</CardTitle>
                <CardDescription>Models with most servers under maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                {(metrics?.maintenanceByModel || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Servers in Maintenance</p>
                      <p className="text-sm">All servers are currently operational</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={metrics?.maintenanceByModel || []}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="model" 
                        stroke="#64748b" 
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                      <Bar dataKey="maintenance" name="In Maintenance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          )}
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
                    {(metrics?.serversByModel || []).map((item: any) => (
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
                    {(metrics?.utilizationByDataCenter || []).map((item: any) => (
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
        </>
        )}
      </Tabs>
    </div>
  );
};

export default Reports;
