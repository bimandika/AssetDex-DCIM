import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Server, Filter, Eye, Map, Search, BarChart3, Zap } from "lucide-react";
import RackVisualization from "./datacenter/RackVisualization";
import { PowerBar } from "./power/PowerUsageCard";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';
import { usePowerData } from "@/hooks/usePowerData";

interface EnumsData {
  sites: string[];
  floors: string[];
  rooms: string[];
  racks: string[];
}

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

interface PowerUsageProps {
  onViewRack?: (rackId: string) => void;
}

const PowerUsage = ({ onViewRack }: PowerUsageProps) => {
  // State for filters
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [filterBy, setFilterBy] = useState<"all" | "status" | "utilization" | "power">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Normal" | "Warning" | "Critical">("all");
  const [utilizationFilter, setUtilizationFilter] = useState<number>(0);
  const [powerFilter, setPowerFilter] = useState<"all" | "low" | "normal" | "high" | "critical">("all");
  const [powerThreshold, setPowerThreshold] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // URL state persistence
  useUrlState('dc_site', selectedSite, setSelectedSite);
  useUrlState('dc_floor', selectedFloor, setSelectedFloor);
  useUrlState('dc_room', selectedRoom, setSelectedRoom);
  
  // Enum data state
  const [enumsData, setEnumsData] = useState<EnumsData>({
    sites: [],
    floors: [],
    rooms: [],
    racks: []
  });
  const [enumsLoading, setEnumsLoading] = useState(true);
  
  const { toast } = useToast();
  
  // Power data integration
  const { globalPower, formatPower } = usePowerData();

  // Fetch enum data from API
  useEffect(() => {
    const fetchEnumsData = async () => {
      try {
        setEnumsLoading(true);
        const apiUrl = import.meta.env.VITE_SUPABASE_URL ? 
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-enums` : 
          'http://localhost:8000/functions/v1/get-enums';
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        setEnumsData({
          sites: data.sites || [],
          floors: data.floors || [],
          rooms: data.rooms || [],
          racks: data.racks || []
        });
        
        // Set default values if none selected
        if (!selectedSite && data.sites && data.sites.length > 0) {
          setSelectedSite(data.sites[0]);
        }
      } catch (error) {
        console.error('Error fetching enums data:', error);
        // Set fallback data
        setEnumsData({
          sites: ['DC-East', 'DC-West', 'DC-Central', 'DC-North'],
          floors: ['1', '2', '3', '4'],
          rooms: ['101', '102', '103', 'MDF'],
          racks: ['RACK-01', 'RACK-02', 'RACK-03']
        });
        if (!selectedSite) {
          setSelectedSite('DC-East');
        }
      } finally {
        setEnumsLoading(false);
      }
    };

    fetchEnumsData();
  }, [selectedSite]);

  // Filter logic
  const filteredRacks = mockRacks.filter(rack => {
    if (selectedSite && rack.location !== selectedSite) return false;
    if (selectedFloor && rack.floor.toString() !== selectedFloor) return false;
    if (filterBy === "status" && statusFilter !== "all" && rack.status !== statusFilter) return false;
    if (filterBy === "utilization" && (rack.occupied / rack.capacity * 100) < utilizationFilter) return false;
    if (filterBy === "power") {
      const powerPercent = rack.powerUsage;
      if (powerFilter === "low" && powerPercent >= 50) return false;
      if (powerFilter === "normal" && (powerPercent < 50 || powerPercent >= 80)) return false;
      if (powerFilter === "high" && (powerPercent < 80 || powerPercent >= 95)) return false;
      if (powerFilter === "critical" && powerPercent < 95) return false;
      if (powerThreshold > 0 && powerPercent < powerThreshold) return false;
    }
    if (searchTerm && !rack.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const floors = [...new Set(mockRacks.filter(r => !selectedSite || r.location === selectedSite).map(r => r.floor))].sort();

  const handleViewRack = (rackId: string, rackName: string) => {
    if (onViewRack) {
      onViewRack(rackId);
    } else {
      toast({
        title: "Rack Selected",
        description: `Viewing detailed information for ${rackName}`
      });
    }
  };

  const getStatusBadge = (status: RackInfo["status"]) => {
    const variants = {
      Normal: "bg-green-100 text-green-700",
      Warning: "bg-yellow-100 text-yellow-700",
      Critical: "bg-red-100 text-red-700"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const groupedByFloor = floors.reduce((acc, floor) => {
    acc[floor] = filteredRacks.filter(rack => rack.floor === floor);
    return acc;
  }, {} as Record<number, RackInfo[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Power Usage</h2>
          <p className="text-slate-600">Monitor and manage power consumption across all data center facilities</p>
        </div>
      </div>

      {/* Filters - Moved to top */}
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
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder={enumsLoading ? "Loading..." : "Select data center"} />
                </SelectTrigger>
                <SelectContent>
                  {enumsData.sites.map(site => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Floor</Label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger>
                  <SelectValue placeholder="All floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Floors</SelectItem>
                  {enumsData.floors.map(floor => (
                    <SelectItem key={floor} value={floor}>Floor {floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Rooms</SelectItem>
                  {enumsData.rooms.map(room => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterBy} onValueChange={(value: "all" | "status" | "utilization" | "power") => setFilterBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="utilization">Utilization</SelectItem>
                  <SelectItem value="power">Power Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Racks</Label>
              <Input
                placeholder="Search rack names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Secondary Filter Row */}
          {filterBy !== "all" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {filterBy === "status" && (
                <div className="space-y-2">
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
                </div>
              )}
              
              {filterBy === "utilization" && (
                <div className="space-y-2">
                  <Label>Min Utilization (%)</Label>
                  <Input
                    type="number"
                    value={utilizationFilter}
                    onChange={(e) => setUtilizationFilter(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              )}
              
              {filterBy === "power" && (
                <>
                  <div className="space-y-2">
                    <Label>Power Level</Label>
                    <Select value={powerFilter} onValueChange={(value: "all" | "low" | "normal" | "high" | "critical") => setPowerFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="low">Low (&lt;50%)</SelectItem>
                        <SelectItem value="normal">Normal (50-79%)</SelectItem>
                        <SelectItem value="high">High (80-94%)</SelectItem>
                        <SelectItem value="critical">Critical (≥95%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Min Power Threshold (%)</Label>
                    <Input
                      type="number"
                      value={powerThreshold}
                      onChange={(e) => setPowerThreshold(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards - Moved below filters */}
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
              <Zap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Power Usage</p>
                <p className="text-2xl font-bold">
                  {globalPower ? formatPower(globalPower.total_usage_watts) : '117kW'}
                </p>
                <p className="text-xs text-slate-500">
                  {globalPower?.usage_percent ? 
                    `${globalPower.usage_percent.toFixed(1)}% of ${formatPower(globalPower.total_capacity_watts)}` 
                    : '5.4% of 2.2MW'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rack Grid */}
      <div className="space-y-6">
        {floors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">No racks match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          floors.map((floor) => {
            const floorRacks = groupedByFloor[floor];
            if (!floorRacks || floorRacks.length === 0) return null;

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
                    {selectedSite || 'All Data Centers'} - Level {floor}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {floorRacks.map((rack) => (
                      <Card key={rack.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{rack.name}</CardTitle>
                            {getStatusBadge(rack.status)}
                          </div>
                          <CardDescription>{rack.location}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Capacity:</span>
                              <span>{rack.occupied}/{rack.capacity} units</span>
                            </div>
                            <PowerBar 
                              current={rack.powerUsage} 
                              max={100} 
                              label={`${rack.powerUsage}%`}
                              size="sm"
                            />
                            <div className="flex justify-between text-sm">
                              <span>Servers:</span>
                              <span>{rack.servers.active}/{rack.servers.total}</span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleViewRack(rack.id, rack.name)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PowerUsage;
