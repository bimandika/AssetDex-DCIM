import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Settings, Trash2, Move, BarChart3, PieChart, TrendingUp, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardWidget from "./DashboardWidget";

export interface DataFilter {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in";
  value: string | string[];
}

export interface DataSource {
  table: string;
  groupBy?: string;
  aggregation?: "count" | "sum" | "avg" | "min" | "max";
  filters?: DataFilter[];
}

export interface Widget {
  id: string;
  type: "metric" | "chart" | "graph" | "table";
  title: string;
  dataSources: DataSource[];
  chartType?: "bar" | "line" | "pie" | "area";
  size: "small" | "medium" | "large";
  config: {
    showTotal?: boolean;
    showPercentage?: boolean;
    color?: string;
    refreshInterval?: number;
  };
}

const DashboardBuilder = () => {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: "1",
      type: "metric",
      title: "Total Servers",
      dataSources: [{ table: "servers", aggregation: "count" }],
      size: "small",
      config: { showTotal: true, color: "#3b82f6" }
    },
    {
      id: "2",
      type: "chart",
      title: "Servers by Device Type",
      dataSources: [{ table: "servers", groupBy: "device_type", aggregation: "count" }],
      chartType: "pie",
      size: "medium",
      config: { showPercentage: true }
    },
    {
      id: "3",
      type: "chart",
      title: "Servers by Environment in DC-East",
      dataSources: [{ 
        table: "servers", 
        groupBy: "environment", 
        aggregation: "count",
        filters: [{ field: "dc_site", operator: "equals", value: "DC-East" }]
      }],
      chartType: "bar",
      size: "medium",
      config: {}
    }
  ]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<Widget>>({
    type: "metric",
    title: "",
    dataSources: [],
    size: "medium",
    config: {}
  });
  
  const { toast } = useToast();

  const availableTables = [
    { value: "servers", label: "Servers" }
  ];

  const availableFields = {
    servers: [
      { value: "hostname", label: "Hostname" },
      { value: "device_type", label: "Device Type" },
      { value: "dc_site", label: "DC Site" },
      { value: "dc_building", label: "DC Building" },
      { value: "dc_floor", label: "DC Floor" },
      { value: "dc_room", label: "DC Room" },
      { value: "allocation", label: "Allocation" },
      { value: "environment", label: "Environment" },
      { value: "manufacturer", label: "Manufacturer" },
      { value: "status", label: "Status" }
    ]
  };

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "in", label: "In (comma separated)" }
  ];

  const widgetTypes = [
    { value: "metric", label: "Metric Card", icon: TrendingUp },
    { value: "chart", label: "Chart", icon: PieChart },
    { value: "graph", label: "Graph", icon: BarChart3 }
  ];

  const addDataSource = () => {
    const newDataSource: DataSource = {
      table: "servers",
      aggregation: "count",
      filters: []
    };
    setNewWidget({
      ...newWidget,
      dataSources: [...(newWidget.dataSources || []), newDataSource]
    });
  };

  const updateDataSource = (index: number, updates: Partial<DataSource>) => {
    const updatedSources = [...(newWidget.dataSources || [])];
    updatedSources[index] = { ...updatedSources[index], ...updates };
    setNewWidget({ ...newWidget, dataSources: updatedSources });
  };

  const removeDataSource = (index: number) => {
    const updatedSources = [...(newWidget.dataSources || [])];
    updatedSources.splice(index, 1);
    setNewWidget({ ...newWidget, dataSources: updatedSources });
  };

  const addFilter = (dataSourceIndex: number) => {
    const updatedSources = [...(newWidget.dataSources || [])];
    const filters = updatedSources[dataSourceIndex].filters || [];
    filters.push({ field: "device_type", operator: "equals", value: "" });
    updatedSources[dataSourceIndex] = { ...updatedSources[dataSourceIndex], filters };
    setNewWidget({ ...newWidget, dataSources: updatedSources });
  };

  const updateFilter = (dataSourceIndex: number, filterIndex: number, updates: Partial<DataFilter>) => {
    const updatedSources = [...(newWidget.dataSources || [])];
    const filters = [...(updatedSources[dataSourceIndex].filters || [])];
    filters[filterIndex] = { ...filters[filterIndex], ...updates };
    updatedSources[dataSourceIndex] = { ...updatedSources[dataSourceIndex], filters };
    setNewWidget({ ...newWidget, dataSources: updatedSources });
  };

  const removeFilter = (dataSourceIndex: number, filterIndex: number) => {
    const updatedSources = [...(newWidget.dataSources || [])];
    const filters = [...(updatedSources[dataSourceIndex].filters || [])];
    filters.splice(filterIndex, 1);
    updatedSources[dataSourceIndex] = { ...updatedSources[dataSourceIndex], filters };
    setNewWidget({ ...newWidget, dataSources: updatedSources });
  };

  const handleAddWidget = () => {
    if (!newWidget.title || !newWidget.dataSources || newWidget.dataSources.length === 0) {
      toast({
        title: "Error",
        description: "Title and at least one Data Source are required",
        variant: "destructive"
      });
      return;
    }

    const widget: Widget = {
      id: Date.now().toString(),
      type: newWidget.type as Widget["type"] || "metric",
      title: newWidget.title,
      dataSources: newWidget.dataSources,
      chartType: newWidget.chartType,
      size: newWidget.size as Widget["size"] || "medium",
      config: newWidget.config || {}
    };

    setWidgets([...widgets, widget]);
    setNewWidget({
      type: "metric",
      title: "",
      dataSources: [],
      size: "medium",
      config: {}
    });
    setIsAddDialogOpen(false);

    toast({
      title: "Success",
      description: `Widget "${widget.title}" added to dashboard`
    });
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    toast({
      title: "Widget Deleted",
      description: "Widget has been removed from dashboard"
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  const getGridClass = (size: string) => {
    switch (size) {
      case "small": return "col-span-1";
      case "medium": return "col-span-2";
      case "large": return "col-span-3";
      default: return "col-span-2";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Custom Dashboard</h2>
          <p className="text-slate-600">Build complex multi-dimensional analytics with chained data sources</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Widget</DialogTitle>
              <DialogDescription>
                Configure a new widget with multiple data sources and filters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Widget Title</Label>
                  <Input
                    id="title"
                    value={newWidget.title || ""}
                    onChange={(e) => setNewWidget({...newWidget, title: e.target.value})}
                    placeholder="e.g., Servers by Brand in DC-East"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Widget Type</Label>
                  <Select value={newWidget.type || "metric"} onValueChange={(value) => setNewWidget({...newWidget, type: value as Widget["type"]})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select widget type" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgetTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newWidget.type === "chart" && (
                <div className="space-y-2">
                  <Label htmlFor="chartType">Chart Type</Label>
                  <Select value={newWidget.chartType || "bar"} onValueChange={(value) => setNewWidget({...newWidget, chartType: value as Widget["chartType"]})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="size">Widget Size</Label>
                <Select value={newWidget.size || "medium"} onValueChange={(value) => setNewWidget({...newWidget, size: value as Widget["size"]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select widget size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (1 column)</SelectItem>
                    <SelectItem value="medium">Medium (2 columns)</SelectItem>
                    <SelectItem value="large">Large (3 columns)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Sources Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Data Sources & Filters</Label>
                  <Button variant="outline" size="sm" onClick={addDataSource}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Data Source
                  </Button>
                </div>

                {newWidget.dataSources?.map((dataSource, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Data Source {index + 1}</h4>
                        {newWidget.dataSources!.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeDataSource(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Table</Label>
                          <Select 
                            value={dataSource.table} 
                            onValueChange={(value) => updateDataSource(index, { table: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTables.map(table => (
                                <SelectItem key={table.value} value={table.value}>
                                  {table.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Group By</Label>
                          <Select 
                            value={dataSource.groupBy || "none"} 
                            onValueChange={(value) => updateDataSource(index, { groupBy: value === "none" ? undefined : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No grouping</SelectItem>
                              {availableFields[dataSource.table as keyof typeof availableFields]?.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Aggregation</Label>
                          <Select 
                            value={dataSource.aggregation || "count"} 
                            onValueChange={(value) => updateDataSource(index, { aggregation: value as DataSource["aggregation"] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="avg">Average</SelectItem>
                              <SelectItem value="min">Minimum</SelectItem>
                              <SelectItem value="max">Maximum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Filters</Label>
                          <Button variant="outline" size="sm" onClick={() => addFilter(index)}>
                            <Filter className="h-3 w-3 mr-1" />
                            Add Filter
                          </Button>
                        </div>

                        {dataSource.filters?.map((filter, filterIndex) => (
                          <div key={filterIndex} className="grid grid-cols-4 gap-2 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">Field</Label>
                              <Select 
                                value={filter.field} 
                                onValueChange={(value) => updateFilter(index, filterIndex, { field: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFields[dataSource.table as keyof typeof availableFields]?.map(field => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Operator</Label>
                              <Select 
                                value={filter.operator} 
                                onValueChange={(value) => updateFilter(index, filterIndex, { operator: value as DataFilter["operator"] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {operators.map(op => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                className="h-8"
                                value={typeof filter.value === 'string' ? filter.value : filter.value.join(', ')}
                                onChange={(e) => updateFilter(index, filterIndex, { 
                                  value: filter.operator === 'in' ? e.target.value.split(',').map(v => v.trim()) : e.target.value 
                                })}
                                placeholder={filter.operator === 'in' ? 'value1, value2' : 'value'}
                              />
                            </div>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => removeFilter(index, filterIndex)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}

                {(!newWidget.dataSources || newWidget.dataSources.length === 0) && (
                  <div className="text-center py-8 text-slate-500">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No data sources configured</p>
                    <p className="text-sm">Add a data source to get started</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddWidget}>
                Add Widget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${getGridClass(widget.size)} relative group`}
                    >
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            {...provided.dragHandleProps}
                          >
                            <Move className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteWidget(widget.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <DashboardWidget widget={widget} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {widgets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Widgets Yet</h3>
            <p className="text-slate-500 mb-4">Start building your dashboard with multi-dimensional analytics</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardBuilder;