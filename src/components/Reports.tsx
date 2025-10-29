import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, ArrowDown, Download, Database, Server, Settings, Loader2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useReportMetrics, type ActivityLogData, type ReportMetrics } from "@/hooks/useReportMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportExporter } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { useServerEnums } from "@/hooks/useServerEnums";

const Reports = () => {
  const [reportType, setReportType] = useState<'inventory' | 'warranty' | 'utilization' | 'maintenance' | 'activity'>('inventory');
  const [selectedDataCenter, setSelectedDataCenter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
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

  const handleExportAllCharts = async () => {
    try {
      await ReportExporter.exportAllCharts(reportType);
      toast({
        title: 'Charts Exported',
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} charts have been exported as an image`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export charts',
        variant: 'destructive',
      });
    }
  };

  const handleExportAllReports = async () => {
    try {
      setIsExporting(true);
      toast({
        title: 'Preparing Export',
        description: 'Fetching all report data...',
      });

      // Fetch data for all report types
      const reportTypes: Array<'inventory' | 'warranty' | 'utilization' | 'maintenance' | 'activity'> = 
        ['inventory', 'warranty', 'utilization', 'maintenance', 'activity'];
      
      const allReportsData: Record<string, ReportMetrics | null> = {};
      const allChartImages: Record<string, string[]> = {};
      
      // First, fetch all the data  
      for (const type of reportTypes) {
        try {
          const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/functions/v1/report-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              filters: {
                reportType: type,
                selectedDataCenter,
                dateRange
              }
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Received data for ${type}:`, result);
            // Extract the actual metrics data from the response
            allReportsData[type] = result.data || result;
          } else {
            console.error(`❌ Failed to fetch ${type}:`, response.status, response.statusText);
            allReportsData[type] = null;
          }
        } catch (err) {
          console.error(`Error fetching ${type} data:`, err);
          allReportsData[type] = null;
        }
      }
      
      console.log('📊 All reports data collected:', allReportsData);
      
      // Now cycle through each report type to capture charts
      toast({
        title: 'Capturing Charts',
        description: 'Please wait while we capture all charts...',
      });
      
      const originalReportType = reportType;
      const html2canvas = (await import('html2canvas')).default;
      
      for (const type of reportTypes) {
        // Switch to this report type
        setReportType(type);
        
        // Wait longer for DOM to update and charts to fully render (increased from 1500ms to 3000ms)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Capture all charts for this report type
        const chartElements = document.querySelectorAll(`[data-chart-id^="${type}-"]`);
        const chartImages: string[] = [];
        
        for (const chartElement of Array.from(chartElements)) {
          try {
            // Wait for chart to fully render and settle
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Force a reflow to ensure chart is rendered
            (chartElement as HTMLElement).getBoundingClientRect();
            
            // Get the actual dimensions of the chart container
            const rect = (chartElement as HTMLElement).getBoundingClientRect();
            const elementWidth = Math.max(rect.width || (chartElement as HTMLElement).offsetWidth, 400);
            const elementHeight = Math.max(rect.height || (chartElement as HTMLElement).offsetHeight, 300);
            
            // Force the element to have explicit dimensions before capture
            const originalWidth = (chartElement as HTMLElement).style.width;
            const originalHeight = (chartElement as HTMLElement).style.height;
            (chartElement as HTMLElement).style.width = `${elementWidth}px`;
            (chartElement as HTMLElement).style.height = `${elementHeight}px`;
            
            const canvas = await html2canvas(chartElement as HTMLElement, {
              scale: 1, // Reduced scale to avoid issues
              backgroundColor: '#ffffff',
              logging: true, // Enable logging to see what's happening
              useCORS: true,
              allowTaint: false,
              removeContainer: false, // Keep container for better layout
              imageTimeout: 10000, // Longer timeout
              width: elementWidth,
              height: elementHeight,
              // Force specific dimensions for consistency
              windowWidth: Math.max(window.innerWidth, elementWidth),
              windowHeight: Math.max(window.innerHeight, elementHeight),
              scrollX: 0,
              scrollY: 0,
              foreignObjectRendering: false, // Disable for SVG compatibility
            });
            
            // Restore original styles
            (chartElement as HTMLElement).style.width = originalWidth;
            (chartElement as HTMLElement).style.height = originalHeight;
            
            // Check if canvas has actual content (not just black/empty)
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              // Check if canvas has any non-black/non-white content
              let hasContent = false;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                // Look for actual chart content (not pure black or pure white)
                if (a > 0 && !((r === 0 && g === 0 && b === 0) || (r > 250 && g > 250 && b > 250))) {
                  hasContent = true;
                  break;
                }
              }
              
              if (!hasContent) {
                console.warn('Chart appears to be empty/black, trying alternative capture method');
                
                // Try to find SVG element within the chart and capture it differently
                const svgElement = (chartElement as HTMLElement).querySelector('svg');
                if (svgElement) {
                  try {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = reject;
                      img.src = url;
                    });
                    
                    const svgCanvas = document.createElement('canvas');
                    svgCanvas.width = elementWidth;
                    svgCanvas.height = elementHeight;
                    const svgCtx = svgCanvas.getContext('2d');
                    if (svgCtx) {
                      svgCtx.fillStyle = '#ffffff';
                      svgCtx.fillRect(0, 0, elementWidth, elementHeight);
                      svgCtx.drawImage(img, 0, 0, elementWidth, elementHeight);
                      const imgData = svgCanvas.toDataURL('image/jpeg', 0.92);
                      chartImages.push(imgData);
                      URL.revokeObjectURL(url);
                      continue;
                    }
                    URL.revokeObjectURL(url);
                  } catch (svgError) {
                    console.error('SVG capture failed:', svgError);
                  }
                }
                
                // If SVG capture also failed, skip this chart
                console.warn('Skipping chart due to capture failure');
                continue;
              }
              
              // Proceed with normal trimming if we have content
              let top = canvas.height, bottom = 0, left = canvas.width, right = 0;
              
              // Find bounds of non-white pixels with better threshold
              for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                  const i = (y * canvas.width + x) * 4;
                  const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                  // Check for non-white pixels with alpha consideration
                  if (a > 10 && (r < 250 || g < 250 || b < 250)) {
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                    if (x < left) left = x;
                    if (x > right) right = x;
                  }
                }
              }
              
              // Ensure we found content, otherwise use full canvas
              if (top >= bottom || left >= right) {
                top = 0;
                left = 0;
                bottom = canvas.height;
                right = canvas.width;
              }
              
              // Add proportional padding based on content size
              const contentWidth = right - left;
              const contentHeight = bottom - top;
              const paddingX = Math.max(5, Math.min(20, contentWidth * 0.05));
              const paddingY = Math.max(5, Math.min(20, contentHeight * 0.05));
              
              top = Math.max(0, top - paddingY);
              left = Math.max(0, left - paddingX);
              bottom = Math.min(canvas.height, bottom + paddingY);
              right = Math.min(canvas.width, right + paddingX);
              
              // Create trimmed canvas with proper dimensions
              const trimmedCanvas = document.createElement('canvas');
              const trimmedWidth = right - left;
              const trimmedHeight = bottom - top;
              trimmedCanvas.width = trimmedWidth;
              trimmedCanvas.height = trimmedHeight;
              const trimmedCtx = trimmedCanvas.getContext('2d');
              
              if (trimmedCtx && trimmedWidth > 0 && trimmedHeight > 0) {
                // Use high-quality scaling
                trimmedCtx.imageSmoothingEnabled = true;
                trimmedCtx.imageSmoothingQuality = 'high';
                trimmedCtx.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
                const imgData = trimmedCanvas.toDataURL('image/jpeg', 0.92);
                chartImages.push(imgData);
              } else {
                // Fallback to original if trimming fails
                const imgData = canvas.toDataURL('image/jpeg', 0.92);
                chartImages.push(imgData);
              }
            } else {
              const imgData = canvas.toDataURL('image/jpeg', 0.92);
              chartImages.push(imgData);
            }
          } catch (err) {
            console.error(`Error capturing chart for ${type}:`, err);
          }
        }
        
        allChartImages[type] = chartImages;
        console.log(`📸 Captured ${chartImages.length} charts for ${type}`);
      }
      
      // Restore original report type
      setReportType(originalReportType);
      
      // Now export with all data and chart images
      await ReportExporter.exportAllReportsWithImages(allReportsData, allChartImages);
      
      setIsExporting(false);
      toast({
        title: 'Complete Export Successful',
        description: 'All reports with charts and tables have been exported',
      });
    } catch (error: any) {
      setIsExporting(false);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export all reports',
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
          <Button variant="outline" onClick={handleExportAllCharts} disabled={loading}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Export Current Charts
          </Button>
          <Button variant="default" onClick={handleExportAllReports} disabled={isExporting || loading}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting All...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export All Reports
              </>
            )}
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
                          outerRadius="80%"
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
                  <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.serversByModel || []}
                      cx="45%"
                      cy="50%"
                      outerRadius="75%"
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
                      wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
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
                  <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.deviceTypeDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
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
                  <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.operatingSystemDistribution || []}
                      cx="45%"
                      cy="50%"
                      outerRadius="75%"
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
                  <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.environmentDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
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
                  <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.serversByStatus || []}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
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
                  <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                    <Pie
                      data={metrics?.warrantyStatus || []}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
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
                      outerRadius="80%"
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
          {/* INVENTORY TABLES */}
          {reportType === 'inventory' && (
            <>
              {/* Server Models Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Server Models</CardTitle>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.serversByModel || []).map((item: any) => (
                          <TableRow key={item.model}>
                            <TableCell className="font-medium">{item.model}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">{item.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Device Type Distribution Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Device Type Distribution</CardTitle>
                  <CardDescription>Breakdown by device category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device Type</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.deviceTypeDistribution || []).map((item: any) => (
                          <TableRow key={item.deviceType}>
                            <TableCell className="font-medium">{item.deviceType}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Servers by Brand Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Servers by Brand</CardTitle>
                  <CardDescription>Hardware vendor distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.serversByBrand || []).map((item: any) => (
                          <TableRow key={item.brand}>
                            <TableCell className="font-medium">{item.brand}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Servers by Location Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Servers by Location</CardTitle>
                  <CardDescription>Server count per datacenter</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.serversByLocation || []).map((item: any) => (
                          <TableRow key={item.location}>
                            <TableCell className="font-medium">{item.location}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Operating System Distribution Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Operating System Distribution</CardTitle>
                  <CardDescription>OS deployment across servers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operating System</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.operatingSystemDistribution || []).map((item: any) => (
                          <TableRow key={item.os}>
                            <TableCell className="font-medium">{item.os}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Allocation Type Distribution Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Allocation Type Distribution</CardTitle>
                  <CardDescription>Service allocation categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Allocation</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.allocationTypeDistribution || []).map((item: any) => (
                          <TableRow key={item.allocation}>
                            <TableCell className="font-medium">{item.allocation}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Environment Distribution Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Environment Distribution</CardTitle>
                  <CardDescription>Production, testing, development split</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Environment</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.environmentDistribution || []).map((item: any) => (
                          <TableRow key={item.environment}>
                            <TableCell className="font-medium">{item.environment}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Server Status Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Server Status</CardTitle>
                  <CardDescription>Current operational status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.serversByStatus || []).map((item: any) => (
                          <TableRow key={item.status}>
                            <TableCell className="font-medium">{item.status}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* WARRANTY TABLES */}
          {reportType === 'warranty' && (
            <>
              {/* Warranty Status Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Warranty Status Overview</CardTitle>
                  <CardDescription>Current warranty status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.warrantyStatus || []).map((item: any) => (
                          <TableRow key={item.status}>
                            <TableCell className="font-medium">
                              <Badge className={
                                item.status === 'Active' ? 'bg-green-100 text-green-800' :
                                item.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty Expiration Timeline Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Warranty Expiration Timeline</CardTitle>
                  <CardDescription>Servers with expiring warranties (next 12 months)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Expiring Warranties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.warrantyExpiration || []).map((item: any) => (
                          <TableRow key={item.month}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="text-right">{item.expiring}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Servers Needing Renewal Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Servers Needing Renewal</CardTitle>
                  <CardDescription>Warranty renewals needed in next 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Servers Expiring</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.serversNeedingRenewal || []).map((item: any) => (
                          <TableRow key={item.month}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty Coverage by Brand Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Warranty Coverage by Brand</CardTitle>
                  <CardDescription>Active vs expired warranties per vendor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead className="text-right">Active</TableHead>
                          <TableHead className="text-right">Expired</TableHead>
                          <TableHead className="text-right">No Warranty</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.warrantyCoverageByBrand || []).map((item: any) => (
                          <TableRow key={item.brand}>
                            <TableCell className="font-medium">{item.brand}</TableCell>
                            <TableCell className="text-right">{item.active}</TableCell>
                            <TableCell className="text-right">{item.expired}</TableCell>
                            <TableCell className="text-right">{item.none}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.active + item.expired + item.none}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* UTILIZATION TABLES */}
          {reportType === 'utilization' && (
            <>
              {/* Data Center Utilization Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Data Center Server Count</CardTitle>
                  <CardDescription>Server distribution by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Center</TableHead>
                          <TableHead className="text-right">Servers</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.utilizationByDataCenter || []).map((item: any) => (
                          <TableRow key={item.dataCenter}>
                            <TableCell className="font-medium">{item.dataCenter}</TableCell>
                            <TableCell className="text-right">{item.servers}</TableCell>
                            <TableCell className="text-right">
                              {((item.servers / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Rack Capacity by Datacenter Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Rack Capacity by Datacenter</CardTitle>
                  <CardDescription>Space utilization across locations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Center</TableHead>
                          <TableHead className="text-right">Used RU</TableHead>
                          <TableHead className="text-right">Available RU</TableHead>
                          <TableHead className="text-right">Total RU</TableHead>
                          <TableHead className="text-right">Utilization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.rackCapacityByDC || []).map((item: any) => (
                          <TableRow key={item.dataCenter}>
                            <TableCell className="font-medium">{item.dataCenter}</TableCell>
                            <TableCell className="text-right">{item.used}</TableCell>
                            <TableCell className="text-right">{item.available}</TableCell>
                            <TableCell className="text-right">{item.total}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={
                                item.utilizationPct > 80 ? 'bg-red-100 text-red-800' :
                                item.utilizationPct > 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {item.utilizationPct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top 10 Utilized Racks Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Utilized Racks</CardTitle>
                  <CardDescription>Racks with highest capacity usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rack</TableHead>
                          <TableHead className="text-right">Servers</TableHead>
                          <TableHead className="text-right">Used RU</TableHead>
                          <TableHead className="text-right">Capacity RU</TableHead>
                          <TableHead className="text-right">Utilization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.topUtilizedRacks || []).map((item: any) => (
                          <TableRow key={item.rackId}>
                            <TableCell className="font-medium">{item.rack}</TableCell>
                            <TableCell className="text-right">{item.servers}</TableCell>
                            <TableCell className="text-right">{item.used}</TableCell>
                            <TableCell className="text-right">{item.capacity}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={
                                item.utilizationPct > 90 ? 'bg-red-100 text-red-800' :
                                item.utilizationPct > 75 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {item.utilizationPct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Device Type by Location Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Device Type by Location</CardTitle>
                  <CardDescription>Hardware distribution across datacenters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Server</TableHead>
                          <TableHead className="text-right">Storage</TableHead>
                          <TableHead className="text-right">Network</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.deviceTypeByLocation || []).map((item: any) => (
                          <TableRow key={item.location}>
                            <TableCell className="font-medium">{item.location}</TableCell>
                            <TableCell className="text-right">{item.Server || 0}</TableCell>
                            <TableCell className="text-right">{item.Storage || 0}</TableCell>
                            <TableCell className="text-right">{item.Network || 0}</TableCell>
                            <TableCell className="text-right font-medium">
                              {(item.Server || 0) + (item.Storage || 0) + (item.Network || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* MAINTENANCE TABLES */}
          {reportType === 'maintenance' && (
            <>
              {/* Server Status Overview Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Server Status Overview</CardTitle>
                  <CardDescription>All servers by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.maintenanceVsActive || []).map((item: any) => (
                          <TableRow key={item.status}>
                            <TableCell className="font-medium">
                              <Badge style={{ backgroundColor: item.fill, color: 'white' }}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {((item.count / (metrics?.totalServers || 1)) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance by Location Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance by Location</CardTitle>
                  <CardDescription>Server status breakdown per datacenter</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Active</TableHead>
                          <TableHead className="text-right">Maintenance</TableHead>
                          <TableHead className="text-right">Other</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(metrics?.maintenanceByLocation || []).map((item: any) => (
                          <TableRow key={item.location}>
                            <TableCell className="font-medium">{item.location}</TableCell>
                            <TableCell className="text-right">{item.active}</TableCell>
                            <TableCell className="text-right">{item.maintenance}</TableCell>
                            <TableCell className="text-right">{item.other}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.active + item.maintenance + item.other}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top 10 Models in Maintenance Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Models in Maintenance</CardTitle>
                  <CardDescription>Models with most servers under maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.maintenanceByModel || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <div className="text-center">
                        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Servers in Maintenance</p>
                        <p className="text-sm">All servers are currently operational</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model</TableHead>
                            <TableHead className="text-right">In Maintenance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(metrics?.maintenanceByModel || []).map((item: any) => (
                            <TableRow key={item.model}>
                              <TableCell className="font-medium">{item.model}</TableCell>
                              <TableCell className="text-right">{item.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ACTIVITY TABLES */}
          {reportType === 'activity' && (
            <>
              {/* Activity by Type Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Activity Distribution by Type</CardTitle>
                  <CardDescription>Breakdown of action types performed</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.activityByType || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Activity Data</p>
                        <p className="text-sm">No actions have been logged in this period</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action Type</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Unique Users</TableHead>
                            <TableHead className="text-right">Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(metrics?.activityByType || []).map((item: any) => (
                            <TableRow key={item.action_type}>
                              <TableCell className="font-medium">
                                <Badge style={{ backgroundColor: item.color, color: 'white' }}>
                                  {item.action_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.count}</TableCell>
                              <TableCell className="text-right">{item.unique_users}</TableCell>
                              <TableCell className="text-right">
                                {((item.count / (metrics?.totalActivities || 1)) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Active Users Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Most Active Users</CardTitle>
                  <CardDescription>Top users by number of actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.activityByUser || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No User Activity</p>
                        <p className="text-sm">No user actions have been recorded</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Action Type</TableHead>
                            <TableHead className="text-right">Action Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(metrics?.activityByUser || []).slice(0, 20).map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.user_email}</TableCell>
                              <TableCell>{item.user_name || '-'}</TableCell>
                              <TableCell>{item.action_type}</TableCell>
                              <TableCell className="text-right">{item.action_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Logs Table */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity Logs</CardTitle>
                  <CardDescription>Latest 100 actions in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {(metrics?.activityLogs || []).length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Activity Logs</p>
                        <p className="text-sm">No detailed activity logs available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
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
                          {(metrics?.activityLogs || []).map((log: ActivityLogData) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {new Date(log.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{log.user_name || 'Unknown'}</div>
                                  <div className="text-muted-foreground text-xs">{log.user_email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  log.action_type === 'create' ? 'bg-green-100 text-green-800' :
                                  log.action_type === 'update' || log.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                  log.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                                  log.action_type === 'login' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {log.action_type.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{log.entity_type}</TableCell>
                              <TableCell className="font-mono text-xs">{log.entity_id || '-'}</TableCell>
                              <TableCell>
                                {log.changes && Object.keys(log.changes).length > 0 ? (
                                  <details className="cursor-pointer">
                                    <summary className="text-xs text-blue-600 hover:underline">
                                      View changes
                                    </summary>
                                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md">
                                      {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                  </details>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No changes</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        </>
        )}
      </Tabs>
    </div>
  );
};

export default Reports;
