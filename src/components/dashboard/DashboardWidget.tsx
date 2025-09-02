import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Widget, DataSource, DataFilter } from "./DashboardBuilder";
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';
import { useState } from "react";

interface DashboardWidgetProps {
  widget: Widget;
}

const DashboardWidget = ({ widget }: DashboardWidgetProps) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  useUrlState(`${widget.id}_page`, page, setPage);
  useUrlState(`${widget.id}_filters`, filters, setFilters);

  // Generate mock data based on widget configuration
  const generateMockData = (dataSources: DataSource[]) => {
    if (!dataSources || dataSources.length === 0) return { value: 0 };

    const primarySource = dataSources[0];
    
    // Generate data based on configuration
    if (primarySource.groupBy) {
      // Chart data with grouping
      const getGroupedData = () => {
        switch (primarySource.groupBy) {
          case "device_type":
            return [
              { name: "Server", value: 142 },
              { name: "Storage", value: 89 },
              { name: "Network", value: 67 }
            ];
          case "environment":
            if (primarySource.filters?.some(f => f.field === "dc_site" && f.value === "DC-East")) {
              return [
                { name: "Production", value: 45 },
                { name: "Testing", value: 23 },
                { name: "Pre-Production", value: 12 },
                { name: "Development", value: 8 }
              ];
            }
            return [
              { name: "Production", value: 189 },
              { name: "Testing", value: 67 },
              { name: "Pre-Production", value: 34 },
              { name: "Development", value: 23 }
            ];
          case "dc_site":
            return [
              { name: "DC-East", value: 88 },
              { name: "DC-West", value: 76 },
              { name: "DC-Central", value: 92 },
              { name: "DC-North", value: 58 }
            ];
          case "dc_floor":
            return [
              { name: "Floor 1", value: 45 },
              { name: "Floor 2", value: 67 },
              { name: "Floor 3", value: 34 },
              { name: "Floor 4", value: 23 }
            ];
          case "manufacturer":
            return [
              { name: "Dell", value: 134 },
              { name: "HPE", value: 89 },
              { name: "Cisco", value: 45 },
              { name: "Supermicro", value: 32 }
            ];
          case "status":
            return [
              { name: "Active", value: 267, color: "#10b981" },
              { name: "Maintenance", value: 23, color: "#f59e0b" },
              { name: "Inactive", value: 8, color: "#ef4444" },
              { name: "Retired", value: 2, color: "#6b7280" }
            ];
          case "allocation":
            return [
              { name: "IAAS/PAAS", value: 145 },
              { name: "SAAS", value: 67 },
              { name: "Load Balancer", value: 34 },
              { name: "Database", value: 54 }
            ];
          default:
            return [
              { name: "Category A", value: 45 },
              { name: "Category B", value: 67 },
              { name: "Category C", value: 23 }
            ];
        }
      };
      return getGroupedData();
    } else {
      // Metric data (single value)
      let baseValue = 314;
      
      // Apply filters to adjust the base value
      if (primarySource.filters) {
        primarySource.filters.forEach(filter => {
          switch (filter.field) {
            case "dc_site":
              if (filter.value === "DC-East") baseValue = 88;
              else if (filter.value === "DC-West") baseValue = 76;
              else if (filter.value === "DC-Central") baseValue = 92;
              else if (filter.value === "DC-North") baseValue = 58;
              break;
            case "environment":
              if (filter.value === "Production") baseValue = 189;
              else if (filter.value === "Testing") baseValue = 67;
              else if (filter.value === "Pre-Production") baseValue = 34;
              else if (filter.value === "Development") baseValue = 23;
              break;
            case "device_type":
              if (filter.value === "Server") baseValue = 142;
              else if (filter.value === "Storage") baseValue = 89;
              else if (filter.value === "Network") baseValue = 67;
              break;
          }
        });
      }
      
      return { 
        value: baseValue, 
        change: Math.floor(Math.random() * 20) - 10,
        percentage: Math.random() * 10
      };
    }
  };

  const data = generateMockData(widget.dataSources);

  const renderMetricWidget = () => {
    if (typeof data === 'object' && 'value' in data) {
      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: widget.config.color || "#3b82f6" }}>
              {data.value.toLocaleString()}
            </div>
            {data.change && (
              <div className={`flex items-center space-x-1 text-xs mt-1 ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{data.change > 0 ? '+' : ''}{data.change} this week</span>
              </div>
            )}
            
            {/* Show applied filters */}
            {widget.dataSources[0]?.filters && widget.dataSources[0].filters.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {widget.dataSources[0].filters.map((filter, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {filter.field}: {typeof filter.value === 'string' ? filter.value : filter.value.join(', ')}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderChartWidget = () => {
    if (Array.isArray(data)) {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">{widget.title}</CardTitle>
            <CardDescription>
              {widget.dataSources[0]?.filters && widget.dataSources[0].filters.length > 0 
                ? `Filtered by: ${widget.dataSources[0].filters.map(f => `${f.field}=${typeof f.value === 'string' ? f.value : f.value.join(',')}`).join(', ')}`
                : "Data visualization"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              {widget.chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={widget.config.showPercentage ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : ({ name, value }) => `${name}: ${value}`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).color || `hsl(${index * 45}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : widget.chartType === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              ) : widget.chartType === "area" ? (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderWidget = () => {
    switch (widget.type) {
      case "metric":
        return renderMetricWidget();
      case "chart":
      case "graph":
        return renderChartWidget();
      default:
        return (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Widget type not supported</p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderWidget();
};

export default DashboardWidget;