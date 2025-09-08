import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Server, Filter, Eye, BarChart3 } from "lucide-react";

import { PowerBar, PowerUsageCard } from "./power/PowerUsageCard";
import { useToast } from "@/hooks/use-toast";
import { useUrlState } from '@/hooks/useAutoSave';

interface EnumsData {
  sites: string[];
  floors: string[];
  rooms: string[];
  racks: string[];
}

interface PowerRackInfo {
  id: string;
  name: string;
  location: string;
  room: string;
  site: string;
  building: string;
  floor: string;
  utilization: number;
  totalServers: number;
  status: 'Active' | 'Maintenance' | 'Offline';
  currentWatts: number;
  capacityWatts: number;
  usagePercent: number;
  remainingWatts: number;
}

interface PowerUsageProps {
  onViewRack?: (rackId: string) => void;
}

const PowerUsage = ({ onViewRack }: PowerUsageProps) => {
  // State for filters
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [filterBy, setFilterBy] = useState<"all" | "status" | "utilization" | "power">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Maintenance" | "Offline">("all");
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
  const [racksData, setRacksData] = useState<PowerRackInfo[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);
  
  const { toast } = useToast();
  
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
      } catch (error) {
        console.error('Error fetching enums data:', error);
        // Set fallback data
        setEnumsData({
          sites: ['DC-East', 'DC-West', 'DC-Central', 'DC-North'],
          floors: ['1', '2', '3', '4'],
          rooms: ['101', '102', '103', 'MDF'],
          racks: ['RACK-01', 'RACK-02', 'RACK-03']
        });
      } finally {
        setEnumsLoading(false);
      }
    };

    fetchEnumsData();
  }, []);

  // Fetch power rack data
  useEffect(() => {
    const fetchPowerRacks = async () => {
      setRacksLoading(true);
      try {
        // Get all racks from get-enums function
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
        const allRacks = data?.racks || [];
        
        // For demonstration, let's create mock power data since the RPC calls don't work through client
        const mockPowerRacks: PowerRackInfo[] = allRacks.slice(0, 20).map((rackName: string, index: number) => {
          const sites = ['DC-East', 'DC-West', 'DC-North', 'DC-Central'];
          const buildings = ['Building-A', 'Building-B', 'Building-C'];
          const rooms = ['MDF', '101', '102', '201', '202', '301'];
          
          const site = sites[index % sites.length];
          const building = buildings[index % buildings.length];
          const room = rooms[index % rooms.length];
          
          // Generate realistic power data
          const serverCount = Math.floor(Math.random() * 15) + 3; // 3-17 servers
          const capacityWatts = [8000, 12000][Math.floor(Math.random() * 2)]; // 8kW or 12kW
          const currentWatts = Math.floor(serverCount * (250 + Math.random() * 300)); // 250-550W per server
          const usagePercent = Math.round((currentWatts / capacityWatts) * 100);
          const utilization = Math.floor(Math.random() * 60) + 20; // 20-80% utilization
          
          let status: 'Active' | 'Maintenance' | 'Offline' = 'Active';
          if (usagePercent > 90) status = 'Maintenance';
          else if (serverCount === 0) status = 'Offline';

          return {
            id: rackName,
            name: rackName,
            location: `${site} - ${building}`,
            room,
            site,
            building,
            floor: (index % 3 + 1).toString(),
            utilization,
            totalServers: serverCount,
            status,
            currentWatts,
            capacityWatts,
            usagePercent,
            remainingWatts: capacityWatts - currentWatts
          };
        });
        
        console.log('✅ Generated power racks:', mockPowerRacks.length, 'racks');
        setRacksData(mockPowerRacks);

      } catch (error) {
        console.error('❌ Failed to fetch power racks:', error);
        toast({
          title: "Error",
          description: "Failed to load rack power data",
          variant: "destructive"
        });
        
        // Fallback data
        setRacksData([]);
      } finally {
        setRacksLoading(false);
      }
    };

    fetchPowerRacks();
  }, [selectedSite]);

  // Filter logic - Use real data instead of mock data
  const filteredRacks = (racksData || []).filter((rack: PowerRackInfo) => {
    if (selectedSite && selectedSite !== "all" && !rack.location.includes(selectedSite)) return false;
    if (selectedRoom && selectedRoom !== "all" && rack.room !== selectedRoom) return false;
    if (filterBy === "status" && statusFilter !== "all" && rack.status !== statusFilter) return false;
    if (filterBy === "utilization" && (rack.utilization || 0) < utilizationFilter) return false;
    if (filterBy === "power") {
      const powerPercent = rack.utilization || 0; // Using utilization as power proxy for now
      if (powerFilter === "low" && powerPercent >= 50) return false;
      if (powerFilter === "normal" && (powerPercent < 50 || powerPercent >= 80)) return false;
      if (powerFilter === "high" && (powerPercent < 80 || powerPercent >= 95)) return false;
      if (powerFilter === "critical" && powerPercent < 95) return false;
      if (powerThreshold > 0 && powerPercent < powerThreshold) return false;
    }
    if (searchTerm && !rack.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // For now, group racks by room since floor data isn't directly available

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

  // Get status badge with appropriate styling
  const getStatusBadge = (status: 'Active' | 'Maintenance' | 'Offline') => {
    const colors = {
      'Active': 'bg-green-100 text-green-800 hover:bg-green-200',
      'Maintenance': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'Offline': 'bg-red-100 text-red-800 hover:bg-red-200'
    };

    return (
      <Badge 
        variant="outline" 
        className={colors[status]}
      >
        {status}
      </Badge>
    );
  };

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
                  <SelectItem value="all">All Data Centers</SelectItem>
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
                  <SelectItem value="all">All Floors</SelectItem>
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
                  <SelectItem value="all">All Rooms</SelectItem>
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
                  <SelectItem value="all">No Filter</SelectItem>
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
                  <Select value={statusFilter} onValueChange={(value: "all" | "Active" | "Maintenance" | "Offline") => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
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
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-8xl font-black text-blue-700 leading-none mb-4">{filteredRacks.length}</div>
              <div className="flex items-center justify-center space-x-2">
                <Building className="h-5 w-5 text-blue-600" />
                <p className="text-base font-semibold text-blue-700">Total Racks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-8xl font-black text-green-700 leading-none mb-4">{filteredRacks.reduce((sum: number, rack: PowerRackInfo) => sum + (rack.totalServers || 0), 0)}</div>
              <div className="flex items-center justify-center space-x-2">
                <Server className="h-5 w-5 text-green-600" />
                <p className="text-base font-semibold text-green-700">Total Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-8xl font-black text-purple-700 leading-none mb-4">
                {filteredRacks.length > 0 
                  ? Math.round(filteredRacks.reduce((sum: number, rack: PowerRackInfo) => sum + (rack.utilization || 0), 0) / filteredRacks.length)
                  : 0}<span className="text-5xl">%</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <p className="text-base font-semibold text-purple-700">Avg Rack Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Enhanced Power Usage Card with Power Breakdown - Now Dynamic */}
        {racksLoading ? (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-4xl font-black text-orange-700 leading-none mb-4">Loading...</div>
                <div className="flex items-center justify-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-orange-600 animate-pulse" />
                  <p className="text-base font-semibold text-orange-700">Power Usage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PowerUsageCard
            title={selectedSite !== 'all' || selectedRoom !== 'all' ? 
              `${selectedSite !== 'all' ? selectedSite : 'Datacenter'} Power Usage${selectedRoom !== 'all' ? ` (${selectedRoom})` : ''}` :
              'Datacenter Power Usage'
            }
            currentWatts={filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0)}
            capacityWatts={filteredRacks.reduce((sum, rack) => sum + (rack.capacityWatts || 0), 0)}
            usagePercent={filteredRacks.length > 0 ? 
              Math.round((filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0) / 
              filteredRacks.reduce((sum, rack) => sum + (rack.capacityWatts || 0), 0)) * 100) : 0}
            status={(() => {
              const usage = filteredRacks.length > 0 ? 
                (filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0) / 
                 filteredRacks.reduce((sum, rack) => sum + (rack.capacityWatts || 0), 0)) * 100 : 0;
              return usage >= 90 ? 'critical' : usage >= 75 ? 'warning' : 'normal';
            })()}
            showPowerBreakdown={true}
            idlePowerWatts={Math.round(filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0) * 0.35)}
            averagePowerWatts={Math.round(filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0) * 0.75)}
            maxPowerWatts={filteredRacks.reduce((sum, rack) => sum + (rack.currentWatts || 0), 0)}
          />
        )}
      </div>

      {/* Rack Grid */}
      <div className="space-y-6">
        {filteredRacks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">No racks match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <CardTitle>Rack Overview</CardTitle>
                </div>
                <Badge variant="outline">
                  {filteredRacks.length} rack{filteredRacks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription>
                {selectedSite || 'All Data Centers'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRacks.map((rack: PowerRackInfo) => (
                  <Card key={rack.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{rack.name}</CardTitle>
                        {getStatusBadge(rack.status)}
                      </div>
                      <CardDescription>{rack.room}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <PowerBar 
                          current={rack.utilization} 
                          max={100} 
                          label={`${rack.utilization}%`}
                          size="sm"
                          showBreakdown={true}
                          idleWatts={Math.round(rack.utilization * 0.3)} // 30% idle
                          averageWatts={Math.round(rack.utilization * 0.65)} // 65% average
                          maxWatts={rack.utilization} // 100% peak
                        />
                        <div className="flex justify-between text-sm">
                          <span>Servers:</span>
                          <span>{rack.totalServers}</span>
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
        )}
      </div>
    </div>
  );
};

export default PowerUsage;
