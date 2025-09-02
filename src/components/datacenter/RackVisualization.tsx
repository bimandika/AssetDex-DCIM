import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { useState } from "react";
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

interface RackVisualizationProps {
  racks: RackInfo[];
}

const RackVisualization = ({ racks }: RackVisualizationProps) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedRacks, setSelectedRacks] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  useUrlState('rackViz_viewMode', viewMode, setViewMode);
  useUrlState('rackViz_selectedRacks', selectedRacks, setSelectedRacks);
  useUrlState('rackViz_zoomLevel', zoomLevel, setZoomLevel);

  const mockServers = [
    { name: "WEB-01", status: "Active", units: "40-41" },
    { name: "WEB-02", status: "Active", units: "38-39" },
    { name: "DB-01", status: "Maintenance", units: "35-37" },
    { name: "APP-01", status: "Active", units: "32-34" },
    { name: "CACHE-01", status: "Active", units: "30-31" },
    { name: "LB-01", status: "Active", units: "28-29" },
    { name: "MON-01", status: "Offline", units: "26-27" }
  ];

  const getServerStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500";
      case "Maintenance": return "bg-yellow-500";
      case "Offline": return "bg-red-500";
      default: return "bg-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {racks.map(rack => (
          <Card key={rack.id} className="border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{rack.name}</CardTitle>
                </div>
                <Badge variant="outline">Floor {rack.floor}</Badge>
              </div>
              <CardDescription>
                {rack.location} • {rack.servers.total} servers • {Math.round((rack.occupied / rack.capacity) * 100)}% utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Rack Visual Representation */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Rack Units (42U)</span>
                    <span className="text-xs text-slate-500">{rack.name}</span>
                  </div>
                  
                  {/* Rack visualization - simplified */}
                  <div className="space-y-1">
                    {/* Top units (42-36) - mostly empty */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div key={i} className="h-2 bg-white border border-slate-200 text-xs flex items-center justify-center rounded">
                          {42 - i}
                        </div>
                      ))}
                    </div>
                    
                    {/* Server units (35-25) */}
                    <div className="space-y-1">
                      {mockServers.slice(0, Math.min(mockServers.length, Math.floor(rack.servers.total * 0.7))).map((server, index) => (
                        <div key={server.name} className="flex items-center space-x-2">
                          <div className="flex-1 flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${getServerStatusColor(server.status)}`}></div>
                            <span className="text-xs font-mono">{server.name}</span>
                          </div>
                          <span className="text-xs text-slate-500">{server.units}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Bottom units (24-1) - mostly empty */}
                    <div className="grid grid-cols-7 gap-1 mt-2">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div key={i} className="h-2 bg-white border border-slate-200 text-xs flex items-center justify-center rounded">
                          {24 - i}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Server List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Active Servers</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {mockServers.slice(0, rack.servers.total).map((server) => (
                      <div key={server.name} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getServerStatusColor(server.status)}`}></div>
                          <span className="font-mono">{server.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">{server.units}</span>
                          <Badge variant="outline" className="text-xs py-0">{server.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-700 font-medium">{rack.servers.active}</div>
                    <div className="text-green-600">Active</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <div className="text-yellow-700 font-medium">{rack.servers.maintenance}</div>
                    <div className="text-yellow-600">Maintenance</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RackVisualization;
