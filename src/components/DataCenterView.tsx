import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Server, Filter, Eye, Map, Search, BarChart3 } from "lucide-react";
import RackVisualization from "./datacenter/RackVisualization";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';

interface RackInfo {
  id: string;
  name: string;
  floor: number;
  location: string;
  capacity: number;
  occupied: number;
  powerUsage: number;
  status: "Normal" | "Warning" | "Critical";
  servers: {
    total: number;
    active: number;
    maintenance: number;
    offline: number;
  };
}

const mockRacks: RackInfo[] = [
  {
    id: "1", name: "A-12", floor: 1, location: "DC-East", capacity: 42, occupied: 28,
    powerUsage: 85, status: "Normal",
    servers: { total: 14, active: 12, maintenance: 1, offline: 1 }
  },
  {
    id: "2", name: "A-13", floor: 1, location: "DC-East", capacity: 42, occupied: 35,
    powerUsage: 92, status: "Warning",
    servers: { total: 18, active: 15, maintenance: 2, offline: 1 }
  },
  {
    id: "3", name: "B-08", floor: 2, location: "DC-East", capacity: 42, occupied: 40,
    powerUsage: 95, status: "Critical",
    servers: { total: 20, active: 17, maintenance: 1, offline: 2 }
  },
  {
    id: "4", name: "B-09", floor: 2, location: "DC-East", capacity: 42, occupied: 22,
    powerUsage: 70, status: "Normal",
    servers: { total: 11, active: 10, maintenance: 1, offline: 0 }
  },
  {
    id: "5", name: "C-05", floor: 3, location: "DC-East", capacity: 42, occupied: 30,
    powerUsage: 80, status: "Normal",
    servers: { total: 15, active: 14, maintenance: 0, offline: 1 }
  },
  {
    id: "6", name: "D-15", floor: 1, location: "DC-West", capacity: 42, occupied: 25,
    powerUsage: 75, status: "Normal",
    servers: { total: 13, active: 12, maintenance: 1, offline: 0 }
  }
];

interface DataCenterViewProps {
  onViewRack?: (rackId: string) => void;
}

const DataCenterView = ({ onViewRack }: DataCenterViewProps) => {
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  useUrlState('dc_site', selectedSite, setSelectedSite);
  useUrlState('dc_building', selectedBuilding, setSelectedBuilding);
  useUrlState('dc_floor', selectedFloor, setSelectedFloor);
  useUrlState('dc_room', selectedRoom, setSelectedRoom);

  const [selectedDataCenter, setSelectedDataCenter] = useState("DC-East");
  const [filterBy, setFilterBy] = useState<"all" | "status" | "utilization">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Normal" | "Warning" | "Critical">("all");
  const [utilizationFilter, setUtilizationFilter] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRack, setSelectedRack] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredRacks = mockRacks.filter(rack => {
    if (rack.location !== selectedDataCenter) return false;
    if (filterBy === "status" && statusFilter !== "all" && rack.status !== statusFilter) return false;
    if (filterBy === "utilization" && (rack.occupied / rack.capacity * 100) < utilizationFilter) return false;
    if (searchTerm && !rack.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const floors = [...new Set(mockRacks.filter(r => r.location === selectedDataCenter).map(r => r.floor))].sort();

  const handleViewRack = (rackId: string, rackName: string) => {
    if (onViewRack) {
      onViewRack(rackId);
    } else {
      setSelectedRack(rackId);
      toast({
        title: "Rack Selected",
        description: `Viewing detailed information for ${rackName}`
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal": return "bg-green-500";
      case "Warning": return "bg-yellow-500";
      case "Critical": return "bg-red-500";
      default: return "bg-gray-300";
    }
  };

  const getStatusBadge = (status: RackInfo["status"]) => {
    const variants = {
      Normal: "bg-green-100 text-green-700 hover:bg-green-100",
      Warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      Critical: "bg-red-100 text-red-700 hover:bg-red-100"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const groupedByFloor = floors.reduce((acc, floor) => {
    acc[floor] = filteredRacks.filter(rack => rack.floor === floor);
    return acc;
  }, {} as Record<number, RackInfo[]>);

  const totalRacks = filteredRacks.length;
  const totalServers = filteredRacks.reduce((sum, rack) => sum + rack.servers.total, 0);
  const avgUtilization = filteredRacks.length > 0 
    ? Math.round(filteredRacks.reduce((sum, rack) => sum + (rack.occupied / rack.capacity * 100), 0) / filteredRacks.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Center View</h2>
          <p className="text-slate-600">Overview of all racks organized by floors with enhanced search</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Racks</p>
                <p className="text-2xl font-bold">{filteredRacks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Total Servers</p>
                <p className="text-2xl font-bold">{filteredRacks.reduce((sum, rack) => sum + rack.servers.total, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">Avg Utilization</p>
                <p className="text-2xl font-bold">
                  {filteredRacks.length > 0 
                    ? Math.round(filteredRacks.reduce((sum, rack) => sum + (rack.occupied / rack.capacity * 100), 0) / filteredRacks.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-red-500 rounded"></div>
              <div>
                <p className="text-sm text-slate-600">Critical Racks</p>
                <p className="text-2xl font-bold text-red-600">{filteredRacks.filter(rack => rack.status === "Critical").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Center</Label>
              <Select value={selectedDataCenter} onValueChange={setSelectedDataCenter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DC-East">DC-East</SelectItem>
                  <SelectItem value="DC-West">DC-West</SelectItem>
                  <SelectItem value="DC-Central">DC-Central</SelectItem>
                  <SelectItem value="DC-North">DC-North</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Floor</Label>
              <Select value={selectedFloor.toString()} onValueChange={(value) => setSelectedFloor(value === "all" ? "all" : parseInt(value).toString())}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map(floor => (
                    <SelectItem key={floor} value={floor.toString()}>Floor {floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterBy} onValueChange={(value: "all" | "status" | "utilization") => setFilterBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="utilization">Utilization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filterBy === "status" && (
                <>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(value: "all" | "Normal" | "Warning" | "Critical") => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {filterBy === "utilization" && (
                <>
                  <Label>Min Utilization (%)</Label>
                  <Input
                    type="number"
                    value={utilizationFilter}
                    onChange={(e) => setUtilizationFilter(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Search Racks</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search rack names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floor Overview */}
      <div className="space-y-6">
        {floors.map(floor => {
          const floorRacks = filteredRacks.filter(rack => rack.floor === floor);
          if (floorRacks.length === 0) return null;

          return (
            <Card key={floor}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <CardTitle>Floor {floor}</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {floorRacks.length} rack{floorRacks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <CardDescription>
                  {selectedDataCenter} - Level {floor}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {floorRacks.map((rack) => (
                    <Card key={rack.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{rack.name}</CardTitle>
                          <Badge className={
                            rack.status === "Normal" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                            rack.status === "Warning" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" :
                            "bg-red-100 text-red-700 hover:bg-red-100"
                          }>
                            {rack.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Capacity:</span>
                          <span className="font-medium">{rack.occupied}/{rack.capacity}U</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (rack.occupied / rack.capacity) > 0.9 ? 'bg-red-500' :
                              (rack.occupied / rack.capacity) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(rack.occupied / rack.capacity) * 100}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Utilization:</span>
                          <span className="font-medium">{Math.round((rack.occupied / rack.capacity) * 100)}%</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Power Usage:</span>
                          <span className="font-medium">{rack.powerUsage}%</span>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Servers:</span>
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>{rack.servers.active}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span>{rack.servers.maintenance}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>{rack.servers.offline}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => handleViewRack(rack.id, rack.name)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Rack
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRacks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Map className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">No racks found matching the current filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataCenterView;
