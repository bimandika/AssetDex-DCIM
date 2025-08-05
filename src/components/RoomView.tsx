import { useState, useEffect } from "react";
import { useHierarchicalFilter } from "@/hooks/useHierarchicalFilter";
import { useRoomData } from "@/hooks/useRoomData";
import { useEnumColors } from "@/hooks/useEnumColors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, RotateCcw, ChevronLeft, ChevronRight, Eye, Monitor, Loader2, AlertCircle, Palette } from "lucide-react";
import { debugServerData, getLogicalViewStats } from "@/utils/debugRoomView";
import { EnumColorManager } from "@/components/EnumColorManager";
import { EnumColorDemo } from "@/components/EnumColorDemo";

type ViewMode = 'physical' | 'logical';

interface RackInfo {
  id: string;
  name: string;
  location: string;
  description?: string;
  utilization: number;
  totalServers: number;
  status: "Active" | "Maintenance" | "Offline";
  room: string;
  servers: ServerInfo[];
}

interface ServerInfo {
  id: string;
  hostname: string;
  position: number;
  model: string;
  type: "Server" | "Network" | "Storage";
  status: "Active" | "Maintenance" | "Offline";
  manufacturer: string;
  unitHeight: number;
  serialNumber?: string;
  ipAddress?: string;
  ipOOB?: string;
  deviceType?: string;
  allocation?: string;
  environment?: string;
}

const RoomView = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("physical");
  const [showColorManager, setShowColorManager] = useState(false);
  const racksPerPage = 12;

  // Use hierarchical filter hook but only up to room level
  const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
  
  // Real data from backend hook
  const { racksData, loading, error } = useRoomData(filters);
  
  // Enum colors hook for coloring servers by allocation and model
  const { getColor: getAllocationColor, lastUpdate: allocationLastUpdate } = useEnumColors('allocation_type');
  const { getColor: getModelColor, lastUpdate: modelLastUpdate } = useEnumColors('model_type');
  
  // Force re-render when colors are updated from other components
  const [colorRefreshKey, setColorRefreshKey] = useState(0);
  
  useEffect(() => {
    const handleColorUpdate = () => {
      console.log('🎨 RoomView received color update event, forcing re-render');
      setColorRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('colorsUpdated', handleColorUpdate);
    
    return () => {
      window.removeEventListener('colorsUpdated', handleColorUpdate);
    };
  }, []);
  
  // Also respond to changes in the lastUpdate timestamps from the hooks
  useEffect(() => {
    console.log('🎨 RoomView detected color update via timestamps, allocation:', allocationLastUpdate, 'model:', modelLastUpdate);
    setColorRefreshKey(prev => prev + 1);
  }, [allocationLastUpdate, modelLastUpdate]);
  
  // Debug logical view data in development
  if (racksData.length > 0) {
    const allServers = racksData.flatMap(rack => rack.servers || []);
    debugServerData(allServers, viewMode);
    
    // Log logical view stats
    const stats = getLogicalViewStats(racksData);
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Logical View Stats:', stats);
    }
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading room data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">Error loading room data: {error}</span>
      </div>
    );
  }

  // Helper function to get status color class
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Maintenance':
        return 'bg-yellow-500';
      case 'Offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Helper function to get server background color based on enum colors
  const getServerBackgroundColor = (server: ServerInfo) => {
    // Use lastUpdate timestamps to ensure this function re-evaluates when colors change
    const refreshTrigger = colorRefreshKey + allocationLastUpdate + modelLastUpdate;
    
    if (viewMode === 'logical' && server.allocation) {
      const allocationColor = getAllocationColor(server.allocation);
      if (allocationColor && allocationColor !== '#ffffff' && allocationColor !== '#000000') {
        return allocationColor;
      }
    } else if (viewMode === 'physical' && server.model) {
      const modelColor = getModelColor(server.model);
      if (modelColor && modelColor !== '#ffffff' && modelColor !== '#000000') {
        return modelColor;
      }
    }
    // Default colors - ensure they're always valid hex colors with good contrast
    return viewMode === 'logical' ? '#2563eb' : '#1f2937'; // blue-600 for logical (darker), gray-800 for physical
  };

    // Use simple black text for all server labels for better visibility
  const getTextColor = () => '#000000';

  // Create rack units array with server positioning
  const createRackUnits = (servers: ServerInfo[]) => {
    const renderUnits: Array<{ unit: number; server?: ServerInfo; isEmpty?: boolean }> = [];
    
    // Create a set of all occupied units for quick lookup
    const occupiedUnits = new Set<number>();
    servers.forEach(server => {
      for (let i = 0; i < server.unitHeight; i++) {
        occupiedUnits.add(server.position - i);
      }
    });
    
    // Create a map of starting position to server for quick lookup
    const serverMap = new Map<number, ServerInfo>();
    servers.forEach(server => {
      serverMap.set(server.position, server);
    });
    
    // Render from top (U42) to bottom (U1)
    for (let unit = 42; unit >= 1; unit--) {
      if (serverMap.has(unit)) {
        // This unit starts a server
        const server = serverMap.get(unit)!;
        renderUnits.push({ unit, server });
      } else if (occupiedUnits.has(unit)) {
        // This unit is occupied by a multi-unit server but not the starting unit
        // Don't render anything for this unit - it's part of the server above
      } else {
        // Empty unit
        renderUnits.push({ unit, isEmpty: true });
      }
    }
    
    return renderUnits;
  };

  // Calculate pagination
  const totalPages = Math.ceil(racksData.length / racksPerPage);
  const startIndex = (currentPage - 1) * racksPerPage;
  const endIndex = startIndex + racksPerPage;
  const currentRacks = racksData.slice(startIndex, endIndex);

  // Get status variant for badge
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Active": return "default";
      case "Maintenance": return "outline";
      case "Offline": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white rounded-lg border">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Room View</h1>
          {filters.dc_room && (
            <Badge variant="secondary" className="ml-2">
              {filters.dc_room}
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter */}
          <Select value={filters.dc_site || ""} onValueChange={(value) => updateFilter('dc_site', value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Site" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.sites?.map((site) => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Building Filter */}
          <Select 
            value={filters.dc_building || ""} 
            onValueChange={(value) => updateFilter('dc_building', value)}
            disabled={!filters.dc_site}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Building" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.buildings?.map((building) => (
                <SelectItem key={building} value={building}>
                  {building}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Floor Filter */}
          <Select 
            value={filters.dc_floor || ""} 
            onValueChange={(value) => updateFilter('dc_floor', value)}
            disabled={!filters.dc_building}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Floor" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.floors?.map((floor) => (
                <SelectItem key={floor} value={floor}>
                  {floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Room Filter */}
          <Select 
            value={filters.dc_room || ""} 
            onValueChange={(value) => updateFilter('dc_room', value)}
            disabled={!filters.dc_floor}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.rooms?.map((room) => (
                <SelectItem key={room} value={room}>
                  {room}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Enhanced View Mode Toggle with Debug Info */}
          <div className="flex items-center gap-4">
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Physical
                  </div>
                </SelectItem>
                <SelectItem value="logical">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Logical
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Debug indicator for development */}
            {process.env.NODE_ENV === 'development' && racksData.length > 0 && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {viewMode.toUpperCase()}
                {(() => {
                  const sample = racksData[0]?.servers[0];
                  if (sample) {
                    return (
                      <span className="ml-2">
                        H: {sample.hostname ? '✅' : '❌'} 
                        IP: {sample.ipAddress ? '✅' : '❌'} 
                        A: {sample.allocation ? '✅' : '❌'}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          <Button onClick={resetFilters} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button 
            onClick={() => setShowColorManager(!showColorManager)} 
            variant="outline" 
            size="sm"
            className="ml-2"
          >
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {racksData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Racks</p>
                <p className="text-2xl font-bold">{racksData.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Servers</p>
                <p className="text-2xl font-bold">{racksData.reduce((sum, rack) => sum + rack.totalServers, 0)}</p>
              </div>
              <Monitor className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold">
                  {racksData.length > 0 ? 
                    Math.round(racksData.reduce((sum, rack) => sum + rack.utilization, 0) / racksData.length) : 0}%
                </p>
              </div>
              <Eye className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Racks</p>
                <p className="text-2xl font-bold">
                  {racksData.filter(rack => rack.status === "Active").length}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full ${getStatusColor('Active')}`} />
            </div>
          </div>
        </div>
      )}

      {/* Room Layout */}
      {!filters.dc_room ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No room selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a site, building, floor, and room to view the rack layout.
          </p>
        </div>
      ) : racksData.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No racks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No racks are configured for this room.
          </p>
        </div>
      ) : (
        <>
          {/* Color Management Section */}
          {showColorManager && (
            <div className="mb-6 space-y-4">
              <EnumColorDemo />
              <EnumColorManager 
                enumType={viewMode === 'logical' ? 'allocation_type' : 'model_type'}
                onColorChange={() => {
                  // Trigger re-render when colors change
                  // The hooks will automatically refetch colors
                }}
              />
            </div>
          )}
          
          {/* Racks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentRacks.map((rack) => (
              <div
                key={rack.id}
                className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* Rack Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{rack.name}</h3>
                      <p className="text-sm text-gray-600">{rack.location}</p>
                    </div>
                    <Badge variant={getStatusVariant(rack.status)}>
                      {rack.status}
                    </Badge>
                  </div>

                  {/* Utilization Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Utilization</span>
                      <span>{Math.round(rack.utilization)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${rack.utilization}%` }}
                      />
                    </div>
                  </div>

                  {/* Server Count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Servers:</span>
                    <span className="font-medium">{rack.totalServers}</span>
                  </div>

                  {/* Full Rack Visualization - Matching RackView Style */}
                  {viewMode === 'physical' && (
                    <div className="mt-3 border rounded">
                      {/* Rack Container with Black Background */}
                      <div className="p-2 rounded-lg" style={{ 
                        backgroundColor: 'black',
                        height: '1280px',
                        overflow: 'hidden'
                      }}>
                        {/* Rack Top Header */}
                        <div className="p-1 rounded-t-lg" style={{ backgroundColor: 'black' }}>
                          <div className="text-white text-center text-xs font-medium">
                            {rack.name}
                          </div>
                          {rack.description && (
                            <div className="text-white text-center text-xs font-bold mt-1">
                              {rack.description}
                            </div>
                          )}
                        </div>
                        
                        {/* Rack Frame with White Rails - Fixed Height No Scroll */}
                        <div className="bg-gray-100 border-l-4 border-r-4" style={{ 
                          borderLeftColor: '#ffffff', 
                          borderRightColor: '#ffffff', 
                          paddingTop: '4px', 
                          paddingBottom: '4px',
                          height: '1185px',
                          overflow: 'visible'
                        }}>
                          <div className="">
                            {createRackUnits(rack.servers).map((unit, index) => {
                              // Multi-unit server display - Clean inline style approach
                              if (unit.server && unit.server.unitHeight > 1) {
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center transition-colors rounded hover:bg-blue-600 hover:border-blue-400"
                                    style={{
                                      minHeight: '24.2px',
                                      height: `${unit.server.unitHeight * 24.2}px`,
                                      paddingLeft: '4px',
                                      paddingRight: '4px',
                                      marginBottom: '2px',
                                      backgroundColor: getServerBackgroundColor(unit.server),
                                      border: '2px solid transparent'
                                    }}
                                  >
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className={`flex items-center justify-between rounded w-full hover:bg-gray-50 transition-all duration-200 ${
                                          viewMode === 'logical' ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                                        }`}
                                        style={{ 
                                          minHeight: `${(unit.server.unitHeight * 24.2) - 8}px`,
                                          height: `${(unit.server.unitHeight * 24.2) - 8}px`,
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          boxShadow: viewMode === 'logical' ? '0 1px 4px rgba(59,130,246,0.15)' : '0 1px 4px rgba(0,0,0,0.07)',
                                          cursor: 'pointer',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div 
                                            className="text-[8px] font-mono flex-shrink-0 text-right"
                                            style={{ 
                                              color: getTextColor()
                                            }}
                                          >
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            {viewMode === 'physical' ? (
                                              // Physical View: Serial Number, Model, IP OOB (horizontal layout)
                                              <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                                <span 
                                                  className="font-mono truncate"
                                                  style={{ 
                                                    color: getTextColor()
                                                  }}
                                                >
                                                  {unit.server.serialNumber || 'N/A'}
                                                </span>
                                                <span 
                                                  className="truncate"
                                                  style={{ 
                                                    color: getTextColor()
                                                  }}
                                                >
                                                  {unit.server.model || 'Unknown'}
                                                </span>
                                                <span 
                                                  className="font-mono truncate"
                                                  style={{ 
                                                    color: getTextColor()
                                                  }}
                                                >
                                                  {unit.server.ipOOB || 'N/A'}
                                                </span>
                                              </div>
                                            ) : (
                                              // Enhanced Logical View: Multi-Unit Server with fallbacks and visual distinction
                                              <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                                <span 
                                                  className="font-medium truncate" 
                                                  title={unit.server.hostname || unit.server.id}
                                                  style={{ 
                                                    color: getTextColor()
                                                  }}
                                                >
                                                  {unit.server.hostname || `Server-${unit.server.id.slice(-4)}`}
                                                </span>
                                                <span 
                                                  className="font-mono truncate" 
                                                  title={unit.server.ipAddress || 'No IP assigned'}
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.ipAddress || 'N/A'}
                                                </span>
                                                <span 
                                                  className="truncate font-medium" 
                                                  title={unit.server.allocation || 'No allocation'}
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.allocation || 'Unassigned'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-1 flex-shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Single unit server or empty unit - Clean inline style approach
                              return (
                                <div
                                  key={index}
                                  className="flex items-center transition-colors rounded"
                                  style={unit.server ? {
                                    minHeight: '24.2px',
                                    height: '24.2px',
                                    paddingLeft: '4px',
                                    paddingRight: '4px',
                                    marginBottom: '2px',
                                    backgroundColor: getServerBackgroundColor(unit.server),
                                    border: '2px solid transparent'
                                  } : {
                                    minHeight: '24.2px',
                                    height: '24.2px', 
                                    paddingLeft: '4px',
                                    paddingRight: '4px',
                                    marginBottom: '2px',
                                    backgroundColor: '#f3f4f6',
                                    border: '2px solid transparent'
                                  }}
                                >
                                  {unit.server ? (
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className={`flex items-center justify-between rounded w-full hover:bg-gray-50 transition-all duration-200 ${
                                          viewMode === 'logical' ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                                        }`}
                                        style={{
                                          minHeight: '16.2px',
                                          height: '16.2px',
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          boxShadow: viewMode === 'logical' ? '0 1px 4px rgba(59,130,246,0.15)' : '0 1px 4px rgba(0,0,0,0.07)',
                                          cursor: 'pointer',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div 
                                            className="text-[8px] font-mono flex-shrink-0 text-right"
                                            style={{ color: getTextColor() }}
                                          >
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            {viewMode === 'physical' ? (
                                              // Physical View: Serial Number, Model, IP OOB (horizontal layout)
                                              <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                                <span 
                                                  className="font-mono truncate"
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.serialNumber || 'N/A'}
                                                </span>
                                                <span 
                                                  className="truncate"
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.model || 'Unknown'}
                                                </span>
                                                <span 
                                                  className="font-mono truncate"
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.ipOOB || 'N/A'}
                                                </span>
                                              </div>
                                            ) : (
                                              // Enhanced Logical View: Single-Unit Server with fallbacks and visual distinction
                                              <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                                <span 
                                                  className="font-medium truncate" 
                                                  title={unit.server.hostname || unit.server.id}
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.hostname || `Server-${unit.server.id.slice(-4)}`}
                                                </span>
                                                <span 
                                                  className="font-mono truncate" 
                                                  title={unit.server.ipAddress || 'No IP assigned'}
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.ipAddress || 'N/A'}
                                                </span>
                                                <span 
                                                  className="truncate font-medium" 
                                                  title={unit.server.allocation || 'No allocation'}
                                                  style={{ color: getTextColor() }}
                                                >
                                                  {unit.server.allocation || 'Unassigned'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-1 flex-shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className="flex items-center justify-between rounded w-full"
                                        style={{
                                          minHeight: '16.2px',
                                          height: '16.2px',
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          backgroundColor: '#f3f4f6',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div className="text-[8px] font-mono text-gray-500 flex-shrink-0" style={{
                                            width: '24px',
                                            textAlign: 'right'
                                          }}>
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 overflow-hidden" style={{
                                            marginLeft: '8px'
                                          }}>
                                            <div className="text-[8px] text-gray-400 italic leading-none">Empty</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Rack Bottom Footer */}
                        <div className="p-1 rounded-b-lg" style={{ backgroundColor: 'black' }}>
                          <div className="text-white text-center text-xs font-medium">
                            {rack.name}
                          </div>
                          {rack.description && (
                            <div className="text-white text-center text-xs font-bold mt-1">
                              {rack.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logical View - Same Rack Style as Physical */}
                  {viewMode === 'logical' && (
                    <div className="mt-3 border rounded">
                      {/* Rack Container with Black Background - Same as Physical */}
                      <div className="p-2 rounded-lg" style={{ 
                        backgroundColor: 'black',
                        height: '1280px',
                        overflow: 'hidden'
                      }}>
                        {/* Rack Top Header */}
                        <div className="p-1 rounded-t-lg" style={{ backgroundColor: 'black' }}>
                          <div className="text-white text-center text-xs font-medium">
                            {rack.name}
                          </div>
                          {rack.description && (
                            <div className="text-white text-center text-xs font-bold mt-1">
                              {rack.description}
                            </div>
                          )}
                        </div>
                        
                        {/* Rack Frame with White Rails - Fixed Height No Scroll */}
                        <div className="bg-gray-100 border-l-4 border-r-4" style={{ 
                          borderLeftColor: '#ffffff', 
                          borderRightColor: '#ffffff', 
                          paddingTop: '4px', 
                          paddingBottom: '4px',
                          height: '1185px',
                          overflow: 'visible'
                        }}>
                          <div className="">
                            {createRackUnits(rack.servers).map((unit, index) => {
                              // Multi-unit server display - Logical View Style
                              if (unit.server && unit.server.unitHeight > 1) {
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center transition-colors rounded hover:bg-blue-600 hover:border-blue-400"
                                    style={{
                                      minHeight: '24.2px',
                                      height: `${unit.server.unitHeight * 24.2}px`,
                                      paddingLeft: '4px',
                                      paddingRight: '4px',
                                      marginBottom: '2px',
                                      backgroundColor: getServerBackgroundColor(unit.server),
                                      border: '2px solid transparent'
                                    }}
                                  >
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className="flex items-center justify-between rounded w-full hover:bg-gray-50 transition-all duration-200 bg-white"
                                        style={{ 
                                          minHeight: `${(unit.server.unitHeight * 24.2) - 8}px`,
                                          height: `${(unit.server.unitHeight * 24.2) - 8}px`,
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                          cursor: 'pointer',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div className="text-[8px] font-mono flex-shrink-0 text-right"
                                               style={{ color: getTextColor() }}>
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            {/* Logical View: Hostname, IP Address, Allocation */}
                                            <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                              <span className="font-medium truncate" 
                                                    style={{ color: getTextColor() }}
                                                    title={unit.server.hostname || unit.server.id}>
                                                {unit.server.hostname || `Server-${unit.server.id.slice(-4)}`}
                                              </span>
                                              <span className="font-mono truncate" 
                                                    style={{ color: getTextColor() }}
                                                    title={unit.server.ipAddress || 'No IP assigned'}>
                                                {unit.server.ipAddress || 'N/A'}
                                              </span>
                                              <span className="truncate font-medium" 
                                                    style={{ color: getTextColor() }}
                                                    title={unit.server.allocation || 'No allocation'}>
                                                {unit.server.allocation || 'Unassigned'}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1 flex-shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Single unit server or empty unit - Logical View Style
                              return (
                                <div
                                  key={index}
                                  className="flex items-center transition-colors rounded"
                                  style={unit.server ? {
                                    minHeight: '24.2px',
                                    height: '24.2px',
                                    paddingLeft: '4px',
                                    paddingRight: '4px',
                                    marginBottom: '2px',
                                    backgroundColor: getServerBackgroundColor(unit.server),
                                    border: '2px solid transparent'
                                  } : {
                                    minHeight: '24.2px',
                                    height: '24.2px', 
                                    paddingLeft: '4px',
                                    paddingRight: '4px',
                                    marginBottom: '2px',
                                    backgroundColor: '#f3f4f6',
                                    border: '2px solid transparent'
                                  }}
                                >
                                  {unit.server ? (
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className="flex items-center justify-between rounded w-full hover:bg-gray-50 transition-all duration-200 bg-white"
                                        style={{
                                          minHeight: '16.2px',
                                          height: '16.2px',
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                          cursor: 'pointer',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div 
                                            className="text-[8px] font-mono flex-shrink-0 text-right"
                                            style={{ color: getTextColor() }}
                                          >
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            {/* Logical View: Hostname, IP Address, Allocation */}
                                            <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                                              <span 
                                                className="font-medium truncate" 
                                                title={unit.server.hostname || unit.server.id}
                                                style={{ color: getTextColor() }}
                                              >
                                                {unit.server.hostname || `Server-${unit.server.id.slice(-4)}`}
                                              </span>
                                              <span 
                                                className="font-mono truncate" 
                                                title={unit.server.ipAddress || 'No IP assigned'}
                                                style={{ color: getTextColor() }}
                                              >
                                                {unit.server.ipAddress || 'N/A'}
                                              </span>
                                              <span 
                                                className="truncate font-medium" 
                                                title={unit.server.allocation || 'No allocation'}
                                                style={{ color: getTextColor() }}
                                              >
                                                {unit.server.allocation || 'Unassigned'}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1 flex-shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center">
                                      <div 
                                        className="flex items-center justify-between rounded w-full"
                                        style={{
                                          minHeight: '16.2px',
                                          height: '16.2px',
                                          paddingLeft: '4px',
                                          paddingRight: '4px',
                                          paddingTop: '4px',
                                          paddingBottom: '4px',
                                          backgroundColor: '#f3f4f6',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 w-full h-full">
                                          <div className="text-[8px] font-mono text-gray-500 flex-shrink-0" style={{
                                            width: '24px',
                                            textAlign: 'right'
                                          }}>
                                            U{unit.unit}
                                          </div>
                                          <div className="flex-1 overflow-hidden" style={{
                                            marginLeft: '8px'
                                          }}>
                                            <div className="text-[8px] text-gray-400 italic leading-none">Empty</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Rack Bottom Footer */}
                        <div className="p-1 rounded-b-lg" style={{ backgroundColor: 'black' }}>
                          <div className="text-white text-center text-xs font-medium">
                            {rack.name}
                          </div>
                          {rack.description && (
                            <div className="text-white text-center text-xs font-bold mt-1">
                              {rack.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, racksData.length)} of {racksData.length} racks
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className="w-8 h-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RoomView;
 