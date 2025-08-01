import { useState } from "react";
import { useHierarchicalFilter } from "@/hooks/useHierarchicalFilter";
import { useRoomData } from "@/hooks/useRoomData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, RotateCcw, ChevronLeft, ChevronRight, Eye, Monitor, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ViewMode = 'physical' | 'logical';

interface RoomViewProps {
  onRackClick?: (rackId: string) => void;
}

interface RackInfo {
  id: string;
  name: string;
  location: string;
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

const RoomView = ({ onRackClick }: RoomViewProps) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("physical");
  const racksPerPage = 12;

  // Use hierarchical filter hook but only up to room level
  const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
  
  // Real data from backend hook
  const { racksData, loading, error } = useRoomData(filters);
  
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

  // Create rack units array with server positioning
  const createRackUnits = (servers: ServerInfo[]) => {
    const units: Array<{ unit: number; server?: ServerInfo; isPartOfMultiUnit?: boolean }> = [];
    
    // Initialize all 42 units as empty
    for (let i = 1; i <= 42; i++) {
      units.push({ unit: i });
    }
    
    // Place servers in their positions
    servers.forEach(server => {
      const startUnit = server.position;
      const endUnit = server.position + server.unitHeight - 1;
      
      for (let u = startUnit; u <= endUnit; u++) {
        const unitIndex = u - 1; // Convert to 0-based index
        if (unitIndex >= 0 && unitIndex < units.length) {
          if (u === startUnit) {
            // First unit of the server
            units[unitIndex] = { unit: u, server };
          } else {
            // Subsequent units of multi-unit server
            units[unitIndex] = { unit: u, server, isPartOfMultiUnit: true };
          }
        }
      }
    });
    
    // Return units in reverse order (U42 to U1, top to bottom)
    return units.reverse();
  };

  // Calculate pagination
  const totalPages = Math.ceil(racksData.length / racksPerPage);
  const startIndex = (currentPage - 1) * racksPerPage;
  const endIndex = startIndex + racksPerPage;
  const currentRacks = racksData.slice(startIndex, endIndex);

  // Handle rack click
  const handleRackClick = (rack: RackInfo) => {
    if (onRackClick) {
      onRackClick(rack.id);
    } else {
      // Navigate to rack view with the rack selected
      navigate(`/rack/${rack.id}`);
    }
  };

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

          {/* View Mode Toggle */}
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

          <Button onClick={resetFilters} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
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
          {/* Racks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentRacks.map((rack) => (
              <div
                key={rack.id}
                className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRackClick(rack)}
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

                  {/* Rack Visualization Preview */}
                  {viewMode === 'physical' && (
                    <div className="mt-3 border rounded">
                      <div className="grid grid-cols-12 gap-px bg-gray-200 p-1">
                        {createRackUnits(rack.servers).slice(0, 24).map((unit, index) => (
                          <div
                            key={index}
                            className={`
                              h-1 w-full
                              ${unit.server 
                                ? unit.isPartOfMultiUnit 
                                  ? getStatusColor(unit.server.status)
                                  : getStatusColor(unit.server.status)
                                : 'bg-gray-100'
                              }
                            `}
                            title={unit.server ? `U${unit.unit}: ${unit.server.hostname}` : `U${unit.unit}: Empty`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-center text-gray-500 py-1">
                        Top 24U Preview
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
