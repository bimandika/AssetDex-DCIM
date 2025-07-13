
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Server } from "lucide-react";

interface RackUnit {
  unit: number;
  server?: {
    id: string;
    serialNumber: string;
    model: string;
    status: "Active" | "Maintenance" | "Offline";
  };
  isEmpty: boolean;
}

const mockRackData: Record<string, RackUnit[]> = {
  "A-12": Array.from({ length: 42 }, (_, i) => {
    const unit = 42 - i;
    const hasServer = Math.random() > 0.6;
    return {
      unit,
      server: hasServer ? {
        id: `server-${unit}`,
        serialNumber: `SN00${unit.toString().padStart(3, '0')}`,
        model: ["Dell R740", "HPE DL380", "Dell R640"][Math.floor(Math.random() * 3)],
        status: ["Active", "Maintenance", "Offline"][Math.floor(Math.random() * 3)] as "Active" | "Maintenance" | "Offline"
      } : undefined,
      isEmpty: !hasServer
    };
  }),
  "A-13": Array.from({ length: 42 }, (_, i) => {
    const unit = 42 - i;
    const hasServer = Math.random() > 0.5;
    return {
      unit,
      server: hasServer ? {
        id: `server-a13-${unit}`,
        serialNumber: `SNA1${unit.toString().padStart(3, '0')}`,
        model: ["Dell R750", "HPE DL380", "Supermicro"][Math.floor(Math.random() * 3)],
        status: ["Active", "Maintenance", "Offline"][Math.floor(Math.random() * 3)] as "Active" | "Maintenance" | "Offline"
      } : undefined,
      isEmpty: !hasServer
    };
  }),
  "B-08": Array.from({ length: 42 }, (_, i) => {
    const unit = 42 - i;
    const hasServer = Math.random() > 0.7;
    return {
      unit,
      server: hasServer ? {
        id: `server-b-${unit}`,
        serialNumber: `SNB0${unit.toString().padStart(3, '0')}`,
        model: ["Dell R750", "HPE DL360", "Supermicro"][Math.floor(Math.random() * 3)],
        status: ["Active", "Maintenance", "Offline"][Math.floor(Math.random() * 3)] as "Active" | "Maintenance" | "Offline"
      } : undefined,
      isEmpty: !hasServer
    };
  }),
  "B-09": Array.from({ length: 42 }, (_, i) => {
    const unit = 42 - i;
    const hasServer = Math.random() > 0.8;
    return {
      unit,
      server: hasServer ? {
        id: `server-b9-${unit}`,
        serialNumber: `SNB9${unit.toString().padStart(3, '0')}`,
        model: ["Dell R640", "HPE DL380", "Cisco UCS"][Math.floor(Math.random() * 3)],
        status: ["Active", "Maintenance", "Offline"][Math.floor(Math.random() * 3)] as "Active" | "Maintenance" | "Offline"
      } : undefined,
      isEmpty: !hasServer
    };
  })
};

interface RackViewProps {
  selectedRackId?: string | null;
}

const RackView = ({ selectedRackId }: RackViewProps) => {
  const [selectedDataCenter, setSelectedDataCenter] = useState("DC-East");
  const [selectedRack, setSelectedRack] = useState("A-12");
  const [draggedServer, setDraggedServer] = useState<string | null>(null);

  // Map rack IDs to rack names for easier lookup
  const rackMap: Record<string, string> = {
    "1": "A-12",
    "2": "A-13", 
    "3": "B-08",
    "4": "B-09"
  };

  // Use selectedRackId from props if provided, otherwise use local state
  const currentRack = selectedRackId && rackMap[selectedRackId] ? rackMap[selectedRackId] : selectedRack;
  const rackData = mockRackData[currentRack] || [];

  const getStatusColor = (status: "Active" | "Maintenance" | "Offline") => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Maintenance":
        return "bg-yellow-500";
      case "Offline":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusBadge = (status: "Active" | "Maintenance" | "Offline") => {
    const variants = {
      Active: "bg-green-100 text-green-700 hover:bg-green-100",
      Maintenance: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      Offline: "bg-red-100 text-red-700 hover:bg-red-100"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const handleDragStart = (e: React.DragEvent, serverId: string) => {
    setDraggedServer(serverId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetUnit: number) => {
    e.preventDefault();
    if (draggedServer) {
      console.log(`Moving server ${draggedServer} to unit ${targetUnit}`);
      // Here you would implement the actual server moving logic
      setDraggedServer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rack View</h2>
          <p className="text-slate-600">Visual layout of your server infrastructure</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedDataCenter} onValueChange={setSelectedDataCenter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Data Center" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DC-East">DC-East</SelectItem>
              <SelectItem value="DC-West">DC-West</SelectItem>
              <SelectItem value="DC-Central">DC-Central</SelectItem>
              <SelectItem value="DC-North">DC-North</SelectItem>
            </SelectContent>
          </Select>
           <Select value={currentRack} onValueChange={setSelectedRack}>
             <SelectTrigger className="w-32">
               <SelectValue placeholder="Select Rack" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="A-12">Rack A-12</SelectItem>
               <SelectItem value="A-13">Rack A-13</SelectItem>
               <SelectItem value="B-08">Rack B-08</SelectItem>
               <SelectItem value="B-09">Rack B-09</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rack Visualization */}
        <div className="lg:col-span-3">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
               <CardTitle className="flex items-center space-x-2">
                 <Database className="h-5 w-5 text-blue-600" />
                 <span>{selectedDataCenter} - {currentRack}</span>
               </CardTitle>
              <CardDescription>
                42U Rack - {rackData.filter(u => !u.isEmpty).length} servers installed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                 <div className="bg-gray-800 p-2 rounded-t-lg">
                   <div className="text-white text-center text-sm font-medium">
                     {currentRack} - Top
                   </div>
                 </div>
                <div className="bg-white border-l-4 border-r-4 border-gray-300 min-h-[800px]">
                  {rackData.map((unit) => (
                    <div
                      key={unit.unit}
                      className={`flex items-center h-8 border-b border-gray-200 px-2 hover:bg-gray-50 transition-colors ${
                        !unit.isEmpty ? 'bg-blue-50' : ''
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, unit.unit)}
                    >
                      <div className="w-8 text-xs font-mono text-gray-500 text-right">
                        U{unit.unit}
                      </div>
                      <div className="flex-1 ml-3">
                        {unit.server ? (
                          <div
                            className="flex items-center justify-between bg-white border rounded px-2 py-1 cursor-move shadow-sm hover:shadow-md transition-shadow"
                            draggable
                            onDragStart={(e) => handleDragStart(e, unit.server!.id)}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                              <Server className="h-3 w-3 text-gray-600" />
                              <span className="text-xs font-medium">{unit.server.model}</span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                              {unit.server.serialNumber}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">Empty</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                 <div className="bg-gray-800 p-2 rounded-b-lg">
                   <div className="text-white text-center text-sm font-medium">
                     {currentRack} - Bottom
                   </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rack Info Panel */}
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
                <span className="font-medium">{rackData.filter(u => !u.isEmpty).length}U</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Available:</span>
                <span className="font-medium">{rackData.filter(u => u.isEmpty).length}U</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Utilization:</span>
                <span className="font-medium">
                  {Math.round((rackData.filter(u => !u.isEmpty).length / 42) * 100)}%
                </span>
              </div>
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

          {/* Server Details */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Server Details</CardTitle>
              <CardDescription>Click on a server in the rack for details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rackData.slice(0, 5).filter(u => !u.isEmpty).map((unit) => (
                  <div key={unit.unit} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">U{unit.unit}</span>
                      {unit.server && getStatusBadge(unit.server.status)}
                    </div>
                    {unit.server && (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600">
                          {unit.server.model}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {unit.server.serialNumber}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RackView;
