import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Server, MapPin, Filter, Download } from "lucide-react";
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';

interface ServerRecord {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  location: string;
  rack: string;
  unit: string;
  ipOOB: string;
  ipOS: string;
  status: "Active" | "Maintenance" | "Offline" | "Decommissioned";
  tenant: string;
}

const mockServers: ServerRecord[] = [
  {
    id: "1", name: "WEB-01", serialNumber: "SN001234567", brand: "Dell", model: "PowerEdge R740",
    location: "DC-East", rack: "A-12", unit: "U40-U41", ipOOB: "192.168.1.101", ipOS: "10.0.1.101",
    status: "Active", tenant: "Production"
  },
  {
    id: "2", name: "WEB-02", serialNumber: "SN001234568", brand: "HPE", model: "ProLiant DL380",
    location: "DC-East", rack: "A-12", unit: "U38-U39", ipOOB: "192.168.1.102", ipOS: "10.0.1.102",
    status: "Active", tenant: "Production"
  },
  {
    id: "3", name: "DB-01", serialNumber: "SN001234569", brand: "Dell", model: "PowerEdge R640",
    location: "DC-East", rack: "A-12", unit: "U35-U37", ipOOB: "192.168.1.103", ipOS: "10.0.1.103",
    status: "Maintenance", tenant: "Production"
  },
  {
    id: "4", name: "APP-01", serialNumber: "SN001234570", brand: "Supermicro", model: "SuperServer 1029P",
    location: "DC-West", rack: "B-08", unit: "U32-U34", ipOOB: "192.168.1.104", ipOS: "10.0.1.104",
    status: "Active", tenant: "Development"
  },
  {
    id: "5", name: "CACHE-01", serialNumber: "SN001234571", brand: "Dell", model: "PowerEdge R740",
    location: "DC-East", rack: "A-13", unit: "U30-U31", ipOOB: "192.168.1.105", ipOS: "10.0.1.105",
    status: "Active", tenant: "Production"
  }
];

const ServerSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  useUrlState('serverSearch_query', searchQuery, setSearchQuery);
  useUrlState('serverSearch_filters', filters, setFilters);
  useUrlState('serverSearch_page', page, setPage);

  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  const filteredServers = mockServers.filter(server => {
    const matchesSearch = !searchTerm || 
      server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.rack.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.ipOS.includes(searchTerm) ||
      server.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === "all" || server.location === locationFilter;
    const matchesStatus = statusFilter === "all" || server.status === statusFilter;
    const matchesTenant = tenantFilter === "all" || server.tenant === tenantFilter;
    const matchesBrand = brandFilter === "all" || server.brand === brandFilter;

    return matchesSearch && matchesLocation && matchesStatus && matchesTenant && matchesBrand;
  });

  const getStatusBadge = (status: ServerRecord["status"]) => {
    const variants = {
      Active: "bg-green-100 text-green-700 hover:bg-green-100",
      Maintenance: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      Offline: "bg-red-100 text-red-700 hover:bg-red-100",
      Decommissioned: "bg-gray-100 text-gray-700 hover:bg-gray-100"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const exportResults = () => {
    const csvContent = [
      "Name,Serial Number,Brand,Model,Location,Rack,Unit,IP OOB,IP OS,Status,Tenant",
      ...filteredServers.map(server => 
        `${server.name},${server.serialNumber},${server.brand},${server.model},${server.location},${server.rack},${server.unit},${server.ipOOB},${server.ipOS},${server.status},${server.tenant}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'server_search_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Advanced Server Search</h3>
        <p className="text-slate-600">Find servers efficiently across all data centers</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="space-y-2">
            <Label>Search Servers</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, serial, rack, IP, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="DC-East">DC-East</SelectItem>
                  <SelectItem value="DC-West">DC-West</SelectItem>
                  <SelectItem value="DC-Central">DC-Central</SelectItem>
                  <SelectItem value="DC-North">DC-North</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="Dell">Dell</SelectItem>
                  <SelectItem value="HPE">HPE</SelectItem>
                  <SelectItem value="Supermicro">Supermicro</SelectItem>
                  <SelectItem value="Cisco">Cisco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Search Results</span>
              </CardTitle>
              <CardDescription>{filteredServers.length} servers found</CardDescription>
            </div>
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rack/Unit</TableHead>
                  <TableHead>IP OS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServers.map((server) => (
                  <TableRow key={server.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-slate-500 font-mono">{server.serialNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{server.brand}</div>
                        <div className="text-sm text-slate-500">{server.model}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{server.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{server.rack}</div>
                        <div className="text-sm text-slate-500">{server.unit}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{server.ipOS}</TableCell>
                    <TableCell>{getStatusBadge(server.status)}</TableCell>
                    <TableCell>{server.tenant}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerSearch;
