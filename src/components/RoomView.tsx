import { useState, useEffect } from "react";
import { useHierarchicalFilter } from "@/hooks/useHierarchicalFilter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, RotateCcw, ChevronLeft, ChevronRight, Eye, Monitor } from "lucide-react";
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
  const [racksData, setRacksData] = useState<RackInfo[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("physical");
  const racksPerPage = 12;

  // Use hierarchical filter hook but only up to room level
  const { hierarchyData, filters, loading: filterLoading, updateFilter, resetFilters } = useHierarchicalFilter();

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

  // Mock data for racks - in real implementation, this would come from an API
  useEffect(() => {
    // Generate mock rack data based on selected room
    if (filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room) {
      const mockRacks: RackInfo[] = [];
      
      for (let i = 1; i <= 20; i++) {
        // Create empty racks with no servers
        const servers: ServerInfo[] = [];
        
        mockRacks.push({
          id: `RACK-${i.toString().padStart(2, '0')}`,
          name: `RACK-${i.toString().padStart(2, '0')}`,
          location: `${filters.dc_building} - Floor ${filters.dc_floor}`,
          utilization: 0, // 0% utilization for empty racks
          totalServers: 0, // No servers
          status: "Active" as "Active" | "Maintenance" | "Offline",
          room: filters.dc_room,
          servers: servers // Empty array
        });
      }
      setRacksData(mockRacks);
      setCurrentPage(1); // Reset to first page when filters change
    } else {
      setRacksData([]);
    }
  }, [filters.dc_site, filters.dc_building, filters.dc_floor, filters.dc_room]);

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
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Room View</h2>
          <p className="text-slate-600">Overview of all racks in the selected room</p>
        </div>
        
        {/* Filter Controls */}
        <div className="flex items-center gap-2 min-w-0">
          <Select value={filters.dc_site || ""} onValueChange={(value) => updateFilter('dc_site', value)}>
            <SelectTrigger className="w-40 h-10 flex-shrink-0">
              <SelectValue placeholder="DC Site" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.sites?.map((site) => (
                <SelectItem key={site} value={site}>{site}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.dc_building || ""} 
            onValueChange={(value) => updateFilter('dc_building', value)}
            disabled={!filters.dc_site}
          >
            <SelectTrigger className="w-36 h-10 flex-shrink-0">
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.buildings?.map((building) => (
                <SelectItem key={building} value={building}>{building}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.dc_floor || ""} 
            onValueChange={(value) => updateFilter('dc_floor', value)}
            disabled={!filters.dc_building}
          >
            <SelectTrigger className="w-28 h-10 flex-shrink-0">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.floors?.map((floor) => (
                <SelectItem key={floor} value={floor}>{floor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.dc_room || ""} 
            onValueChange={(value) => updateFilter('dc_room', value)}
            disabled={!filters.dc_floor}
          >
            <SelectTrigger className="w-32 h-10 flex-shrink-0">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.rooms?.map((room) => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32 h-10 flex-shrink-0">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>Physical</span>
                </div>
              </SelectItem>
              <SelectItem value="logical">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Logical</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="default" onClick={resetFilters} className="flex-shrink-0 h-10 px-4">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        
        {filterLoading && (
          <div className="text-sm text-blue-600">Loading hierarchy data...</div>
        )}
        
        {/* Room Info */}
        {filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {filters.dc_site} - {filters.dc_building} - Floor {filters.dc_floor} - {filters.dc_room}
                </span>
              </div>
              <div className="text-sm text-blue-700">
                {racksData.length} racks total
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Racks Visualization */}
      {filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room ? (
        <>
          {racksData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentRacks.map((rack) => (
                  <div key={rack.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Rack Header */}
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {rack.name}
                          </h3>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(rack.status)}`}></div>
                        </div>
                        <Badge variant={getStatusVariant(rack.status)} className="text-xs">
                          {rack.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {rack.totalServers} servers • {rack.utilization}%
                      </div>
                    </div>
                    
                    {/* Rack Visualization */}
                    <div className="p-3">
                      <div className="bg-gray-100 border border-gray-300 rounded-lg overflow-hidden">
                        {/* Room-optimized 42U rack view */}
                        <div className="bg-black p-2 rounded-lg">
                          <div className="text-white text-center text-xs font-medium mb-2">
                            {rack.name}
                          </div>
                          
                          <div className="bg-gray-50 border-2 border-gray-300 rounded" style={{ height: '1225px' }}>
                            <div className="p-1">
                              {createRackUnits(rack.servers).map((unit) => {
                                // Skip rendering subsequent units of multi-unit servers
                                if (unit.server && unit.server.unitHeight > 1 && unit.isPartOfMultiUnit) {
                                  return null;
                                }
                                
                                // Render server unit (both single and multi-unit starting positions)
                                if (unit.server) {
                                  return (
                                    <div
                                      key={unit.unit}
                                      className="flex items-center mb-1 px-1 py-1 bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300"
                                      style={{ 
                                        height: '25px', // Fixed height for all units
                                        minHeight: '25px'
                                      }}
                                      onClick={() => handleRackClick(rack)}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                          <div className="text-xs font-mono text-gray-500 flex-shrink-0 w-6 text-center">
                                            U{unit.unit}
                                            {unit.server.unitHeight > 1 && (
                                              <span className="text-gray-400">-{unit.unit + unit.server.unitHeight - 1}</span>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-gray-900 truncate">
                                              {unit.server.hostname}
                                            </div>
                                            {unit.server.unitHeight > 1 && (
                                              <div className="text-xs text-gray-500 truncate">
                                                {unit.server.unitHeight}U • {unit.server.manufacturer}
                                              </div>
                                            )}
                                            {unit.server.unitHeight === 1 && viewMode === 'physical' && (
                                              <div className="text-xs text-gray-500 truncate">
                                                {unit.server.manufacturer}
                                              </div>
                                            )}
                                            {unit.server.unitHeight === 1 && viewMode === 'logical' && (
                                              <div className="text-xs text-gray-500 truncate">
                                                {unit.server.ipAddress}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                          <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Render empty unit
                                return (
                                  <div
                                    key={unit.unit}
                                    className="flex items-center mb-1 px-1 py-1 border border-gray-100 rounded"
                                    style={{ 
                                      height: '25px', // Changed height for empty units
                                      minHeight: '25px'
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-xs font-mono text-gray-400 flex-shrink-0 w-6 text-center">
                                          U{unit.unit}
                                        </div>
                                        <div className="text-xs text-gray-300 italic">
                                          Empty
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>
                          </div>
                          
                          <div className="text-white text-center text-xs font-medium mt-2">
                            {rack.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, racksData.length)} of {racksData.length} racks
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg text-gray-600">No racks found</div>
                <div className="text-sm text-gray-500">Try selecting a different room</div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Select a room to view racks</div>
            <div className="text-sm text-gray-500">Use the filters above to choose DC Site, Building, Floor, and Room</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
