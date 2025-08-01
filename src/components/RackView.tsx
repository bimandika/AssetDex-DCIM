
import React, { useState } from "react";
import { useRackData, ViewMode } from "@/hooks/useRackData";
import { useHierarchicalFilter } from "@/hooks/useHierarchicalFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Eye, Monitor, Info, Edit3, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface RackViewProps {
  onEditServer?: (serverId: string) => void;
}

const RackView = ({ onEditServer }: RackViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("physical");
  const [rackDescription, setRackDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [selectedRack, setSelectedRack] = useState<string>("");

  // Use hierarchical filter hook
  const { hierarchyData, filters, loading: filterLoading, defaultRack, updateFilter, resetFilters } = useHierarchicalFilter();

  // Determine the current rack - use filter rack if set, otherwise use the default logic
  const currentRack = filters.rack 
    ? filters.rack
    : selectedRack 
    || (hierarchyData.racks.length > 0 && filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room 
       ? hierarchyData.racks[0] 
       : defaultRack || hierarchyData.allRacks?.[0] || "RACK-01");

  // Use real data for display only
  const { rackData, loading, error } = useRackData(currentRack);

  // Debug: Log the rack data to see what we're getting
  React.useEffect(() => {
    if (rackData) {
      console.log('RackData units:', rackData.units.filter(u => u.server));
      console.log('Multi-unit servers:', rackData.units.filter(u => u.server && u.server.unitHeight > 1));
      // Fetch existing description from rack_metadata table
      fetchRackDescription();
    }
  }, [rackData]);

  // Function to fetch rack description from database using Edge Function
  const fetchRackDescription = async () => {
    if (!rackData) return;
    
    try {
      // Use the get-rack-data function to fetch rack metadata
      const { data, error } = await supabase.functions.invoke('get-rack-data', {
        body: { rackName: rackData.name }
      });

      if (error) {
        console.error('Error fetching rack description:', error);
        return;
      }

      if (data && data.data && data.data.description) {
        setRackDescription(data.data.description);
      }
    } catch (error) {
      console.error('Error fetching rack description:', error);
    }
  };

  // Function to save rack description using Supabase Edge Function
  const saveRackDescription = async () => {
    if (!rackData) return;
    
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      // Use the Supabase Edge Function we created
      const { error } = await supabase.functions.invoke('update-rack-description', {
        body: {
          rack_name: rackData.name,
          dc_site: rackData.datacenter_id,
          dc_building: 'Building-A', // You may need to get this from rack data
          dc_floor: '1', // You may need to get this from rack data
          dc_room: 'MDF', // You may need to get this from rack data
          description: rackDescription
        }
      });

      if (error) {
        throw error;
      }

      setSaveMessage("Description saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
      // Refresh the description display
      await fetchRackDescription();
    } catch (error) {
      console.error('Error saving rack description:', error);
      setSaveMessage("Error saving description");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to get device type icon
  const getDeviceIcon = (deviceType: string) => {
    const iconProps = {
      className: "h-3 w-3",
      style: { display: "inline-block" }
    };

    switch (deviceType?.toLowerCase()) {
      case "server":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="16" rx="1.5" fill="#2563eb" stroke="#1e40af" strokeWidth="0.5"/>
            <rect x="3" y="5.5" width="18" height="3" rx="0.5" fill="#011330" stroke="#1e40af" strokeWidth="0.3"/>
            <rect x="3" y="9" width="18" height="3" rx="0.5" fill="#011330" stroke="#1e40af" strokeWidth="0.3"/>
            <rect x="3" y="12.5" width="18" height="3" rx="0.5" fill="#011330" stroke="#1e40af" strokeWidth="0.3"/>
            <rect x="3" y="16" width="18" height="3" rx="0.5" fill="#011330" stroke="#1e40af" strokeWidth="0.3"/>
            <circle cx="5" cy="7" r="0.8" fill="#10b981"/>
            <circle cx="5" cy="10.5" r="0.8" fill="#10b981"/>
            <circle cx="5" cy="14" r="0.8" fill="#10b981"/>
            <circle cx="5" cy="17.5" r="0.8" fill="#fbbf24"/>
          </svg>
        );
      case "storage":
      case "nas":
      case "san":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="#7c3aed" stroke="#6d28d9" strokeWidth="0.5"/>
            <rect x="4" y="6" width="16" height="2.5" rx="0.5" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="0.3"/>
            <rect x="5" y="9.5" width="2" height="1.5" rx="0.3" fill="#a855f7"/>
            <rect x="7.5" y="9.5" width="2" height="1.5" rx="0.3" fill="#a855f7"/>
            <rect x="10" y="9.5" width="2" height="1.5" rx="0.3" fill="#a855f7"/>
            <rect x="12.5" y="9.5" width="2" height="1.5" rx="0.3" fill="#a855f7"/>
            <circle cx="6" cy="7.2" r="0.4" fill="#10b981"/>
            <circle cx="8" cy="7.2" r="0.4" fill="#10b981"/>
            <circle cx="10" cy="7.2" r="0.4" fill="#fbbf24"/>
          </svg>
        );
      case "network":
      case "switch":
      case "router":
      case "firewall":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="7" width="18" height="10" rx="1.5" fill="#059669" stroke="#047857" strokeWidth="0.5"/>
            <rect x="4" y="8" width="16" height="8" rx="0.5" fill="#10b981" stroke="#059669" strokeWidth="0.3"/>
            <rect x="5" y="9" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <rect x="6.5" y="9" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <rect x="8" y="9" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <rect x="9.5" y="9" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <rect x="5" y="10.5" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <rect x="6.5" y="10.5" width="1.2" height="1" rx="0.2" fill="#34d399"/>
            <circle cx="16" cy="14.2" r="0.4" fill="#10b981"/>
            <circle cx="17" cy="14.2" r="0.4" fill="#fbbf24"/>
          </svg>
        );
      default:
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="16" height="10" rx="1" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5"/>
            <rect x="5" y="7" width="14" height="8" rx="0.5" fill="#011330"/>
            <rect x="6" y="8" width="12" height="6" rx="0.3" fill="#011330"/>
            <rect x="7" y="8.5" width="6" height="0.3" rx="0.1" fill="#10b981"/>
            <rect x="7" y="9.2" width="8" height="0.3" rx="0.1" fill="#011330"/>
            <rect x="10" y="16" width="4" height="1.5" rx="0.3" fill="#011330"/>
            <circle cx="19" cy="7.5" r="0.4" fill="#10b981"/>
          </svg>
        );
    }
  };

  // Helper function to render server info based on view mode
  const renderServerInfo = (server: any) => {
    if (viewMode === 'physical') {
      return (
        <div className="flex items-center space-x-1">
          {getDeviceIcon(server.deviceType)}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.serialNumber}
            </Badge>
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {server.brand}
            </Badge>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.model}
            </Badge>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.ipOOB}
            </Badge>
            <Badge variant="default" className="text-xs px-1 py-0">
              {server.deviceType}
            </Badge>
            <Badge variant={getStatusVariant(server.status)} className="text-xs px-1 py-0">
              {server.status}
            </Badge>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1">
          {getDeviceIcon(server.deviceType)}
          <div className="flex flex-wrap gap-1">
            <Badge variant="default" className="text-xs px-1 py-0">
              {server.hostname}
            </Badge>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.ipAddress}
            </Badge>
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {server.allocation}
            </Badge>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.operatingSystem}
            </Badge>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {server.environment}
            </Badge>
          </div>
        </div>
      );
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading rack data...</div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-red-500">Error: {error}</div>
    </div>
  );

  if (!rackData) return null;

  if (!rackData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rack View</h2>
          <p className="text-slate-600">Visual layout of your server infrastructure</p>
        </div>
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
            <SelectTrigger className="w-28 h-10 flex-shrink-0">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.rooms?.map((room) => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={currentRack} 
            onValueChange={(value) => setSelectedRack(value)}
            disabled={!filters.dc_room}
          >
            <SelectTrigger className="w-32 h-10 flex-shrink-0">
              <SelectValue placeholder="Rack" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.racks?.map((rack) => (
                <SelectItem key={rack} value={rack}>{rack}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="w-px h-6 bg-gray-300 mx-1 flex-shrink-0"></div>
          
          <Select 
            value={filters.rack || ""} 
            onValueChange={(value) => updateFilter('rack', value)}
          >
            <SelectTrigger className="w-36 h-10 flex-shrink-0">
              <SelectValue placeholder="Any Rack" />
            </SelectTrigger>
            <SelectContent>
              {hierarchyData.allRacks?.map((rack) => (
                <SelectItem key={rack} value={rack}>{rack}</SelectItem>
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
          <Button variant="outline" size="default" onClick={() => setIsEditingDescription(true)} className="flex-shrink-0 h-10 px-4">
            Edit Rack
          </Button>
        </div>
        {filterLoading && (
          <div className="text-sm text-blue-600">Loading hierarchy data...</div>
        )}
      </div>

      {/* View Mode Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          {viewMode === 'physical' ? (
            <>
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Physical View</span>
              <span className="text-xs text-blue-700">
                Showing: Serial Number • Brand • Model • IP OOB • Device Type • Status
              </span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Logical View</span>
              <span className="text-xs text-blue-700">
                Showing: Hostname • IP Address • Allocation • Operating System • Environment
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rack Visualization */}
        <div className="lg:col-span-3">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>
                  {filters.dc_site || rackData.datacenter_id} - {filters.dc_building || rackData.location} - {filters.dc_floor || `Floor ${rackData.floor}`} - {filters.dc_room || 'Room-01'} - {rackData.name}
                </span>
                <Badge variant="outline">{viewMode} view</Badge>
              </CardTitle>
              <CardDescription>
                42U Rack - {rackData.statistics.totalServers} servers installed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'black' }}>
                <div className="p-2 rounded-t-lg" style={{ backgroundColor: 'black' }}>
                  <div className="text-white text-center text-sm font-medium">
                    {rackData.name}
                  </div>
                  {rackDescription && (
                    <div className="text-white text-center text-sm font-bold mt-2">
                      {rackDescription}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border-l-4 border-r-4 min-h-[800px]" style={{ borderLeftColor: '#ffffff', borderRightColor: '#ffffff', paddingTop: '8px', paddingBottom: '8px' }}>
                  <TooltipProvider>
                    {rackData.units.map((unit) => {
                      // For multi-unit servers, only render the starting unit (not marked as isPartOfMultiUnit)
                      if (unit.server && unit.server.unitHeight > 1 && unit.isPartOfMultiUnit) {
                        return null; // Skip non-starting units of multi-unit servers
                      }
                      
                      // Render multi-unit server as a merged unit
                      if (unit.server && unit.server.unitHeight > 1) {
                        return (
                          <div
                            key={unit.unit}
                            className="flex items-center border-b border-gray-200 px-1 transition-colors bg-black rounded hover:bg-blue-600 border-2 border-transparent hover:border-blue-400"
                            style={{ 
                              minHeight: `${unit.server.unitHeight * 2.5}rem`,
                              paddingTop: '3px',
                              paddingBottom: '3px',
                              marginBottom: '2px'
                            }}
                          >
                            <div className="flex-1 flex items-center">
                              <div 
                                className="flex items-center justify-between bg-white rounded px-2 py-2 shadow-sm w-full hover:bg-gray-50 transition-all duration-200"
                                style={{ 
                                  minHeight: `${unit.server.unitHeight * 2.5 * 0.99}rem`,
                                  height: `${unit.server.unitHeight * 2.5 * 0.99}rem`,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                                }}
                              >
                                <div className="flex items-center space-x-3 w-full">
                                  <div className="text-xs font-mono text-gray-600 flex-shrink-0 flex flex-col justify-center text-right">
                                    <div>U{unit.unit}</div>
                                    <div className="text-gray-400">-</div>
                                    <div>U{unit.unit + unit.server.unitHeight - 1}</div>
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="mb-1">
                                      {renderServerInfo(unit.server)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {unit.server.unitHeight}U Server (Units U{unit.unit}-U{unit.unit + unit.server.unitHeight - 1})
                                    </div>
                                    {unit.server.unitHeight >= 3 && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Height: {unit.server.unitHeight} Units • Model: {unit.server.model}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <div className={`w-4 h-4 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <div className="space-y-1">
                                          <div><strong>Hostname:</strong> {unit.server.hostname}</div>
                                          <div><strong>Serial:</strong> {unit.server.serialNumber}</div>
                                          <div><strong>Model:</strong> {unit.server.model}</div>
                                          <div><strong>Status:</strong> {unit.server.status}</div>
                                          <div><strong>IP Address:</strong> {unit.server.ipAddress}</div>
                                          <div><strong>IP OOB:</strong> {unit.server.ipOOB}</div>
                                          <div><strong>Device Type:</strong> {unit.server.deviceType}</div>
                                          <div><strong>Allocation:</strong> {unit.server.allocation}</div>
                                          <div><strong>Environment:</strong> {unit.server.environment}</div>
                                          <div><strong>Height:</strong> {unit.server.unitHeight}U</div>
                                          <div><strong>DC Site:</strong> {rackData.datacenter_id}</div>
                                          <div><strong>DC Building:</strong> {rackData.location}</div>
                                          <div><strong>DC Floor:</strong> Floor {rackData.floor}</div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Render normal 1U servers and empty units
                      return (
                        <div
                          key={unit.unit}
                          className={`flex items-center min-h-10 border-b border-gray-200 px-1 transition-colors ${
                            unit.server ? 'bg-black rounded hover:bg-blue-600 border-2 border-transparent hover:border-blue-400' : ''
                          }`}
                          style={unit.server ? {
                            paddingTop: '3px',
                            paddingBottom: '3px',
                            marginBottom: '2px'
                          } : {}}
                        >
                          {unit.server ? (
                            <div className="flex-1 flex items-center">
                              <div 
                                className="flex items-center justify-between bg-white rounded px-2 py-2 shadow-sm w-full hover:bg-gray-50 transition-all duration-200"
                                style={{
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                                }}
                              >
                                <div className="flex items-center space-x-3 w-full">
                                  <div className="text-xs font-mono text-gray-600 flex-shrink-0 text-right">
                                    U{unit.unit}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {renderServerInfo(unit.server)}
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-pointer" />
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <div className="space-y-1">
                                          <div><strong>Hostname:</strong> {unit.server.hostname}</div>
                                          <div><strong>Serial:</strong> {unit.server.serialNumber}</div>
                                          <div><strong>Model:</strong> {unit.server.model}</div>
                                          <div><strong>Status:</strong> {unit.server.status}</div>
                                          <div><strong>IP Address:</strong> {unit.server.ipAddress}</div>
                                          <div><strong>IP OOB:</strong> {unit.server.ipOOB}</div>
                                          <div><strong>Device Type:</strong> {unit.server.deviceType}</div>
                                          <div><strong>Allocation:</strong> {unit.server.allocation}</div>
                                          <div><strong>Environment:</strong> {unit.server.environment}</div>
                                          <div><strong>Height:</strong> {unit.server.unitHeight}U</div>
                                          <div><strong>DC Site:</strong> {rackData.datacenter_id}</div>
                                          <div><strong>DC Building:</strong> {rackData.location}</div>
                                          <div><strong>DC Floor:</strong> Floor {rackData.floor}</div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-8 text-xs font-mono text-right flex-shrink-0 text-gray-400">
                                U{unit.unit}
                              </div>
                              <div className="flex-1 ml-3">
                                <div className="text-xs text-gray-300 italic py-2">Empty</div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }).filter(Boolean)}
                  </TooltipProvider>
                </div>
                <div className="p-2 rounded-b-lg" style={{ backgroundColor: 'black' }}>
                  <div className="text-white text-center text-sm font-medium">
                    {rackData.name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Info Panel */}
        <div className="space-y-6">
          {/* Rack Statistics */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Rack Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Units:</span>
                <span className="font-medium">42U</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Occupied:</span>
                <span className="font-medium">{rackData.statistics.occupiedUnits}U</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Available:</span>
                <span className="font-medium">{rackData.statistics.availableUnits}U</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Utilization:</span>
                <span className="font-medium">{rackData.statistics.utilizationPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Servers:</span>
                <span className="font-medium">{rackData.statistics.totalServers}</span>
              </div>
            </CardContent>
          </Card>

          {/* Server Status Breakdown */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Server Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(rackData.statistics.serversByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                    <span className="text-sm">{status}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Legend */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Status Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Maintenance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Offline</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-sm">Empty</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Rack Dialog */}
      <Dialog open={isEditingDescription} onOpenChange={setIsEditingDescription}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit3 className="h-5 w-5" />
              <span>Edit Rack</span>
            </DialogTitle>
            <DialogDescription>
              Update the rack description for {rackData?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={rackDescription}
                onChange={(e) => setRackDescription(e.target.value)}
                placeholder="Enter rack description"
                maxLength={40}
                className="col-span-3"
              />
            </div>
            <div className="text-xs text-gray-500 text-right">
              {rackDescription.length}/40 characters
            </div>
            {saveMessage && (
              <div className={`text-sm ${saveMessage.includes('Error') || saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                {saveMessage}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditingDescription(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={async () => {
                await saveRackDescription();
                if (!saveMessage.includes('Error') && !saveMessage.includes('Failed')) {
                  setTimeout(() => setIsEditingDescription(false), 1000);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "Active": return "bg-green-500";
    case "Ready": return "bg-blue-500";
    case "Maintenance": return "bg-yellow-500";
    case "Offline": 
    case "Inactive": return "bg-red-500";
    case "Decommissioned":
    case "Retired": return "bg-gray-500";
    default: return "bg-gray-300";
  }
};

// Helper function for badge variants based on status
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Active": return "default";
    case "Ready": return "secondary";
    case "Maintenance": return "outline";
    case "Offline": 
    case "Inactive": return "destructive";
    case "Decommissioned":
    case "Retired": return "secondary";
    default: return "outline";
  }
};

export default RackView;
