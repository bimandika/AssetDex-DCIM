import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types matching the database enums
type DeviceType = 'Server' | 'Storage' | 'Network';
type AllocationType = 'IAAS' | 'PAAS' | 'SAAS' | 'Load Balancer' | 'Database';
type EnvironmentType = 'Production' | 'Testing' | 'Pre-Production' | 'Development';

interface Server {
  id: string;
  serial_number?: string;
  hostname: string;
  brand?: string;
  model?: string;
  ip_address?: string;
  ip_oob?: string;
  operating_system?: string;
  dc_site: string;
  dc_building?: string;
  dc_floor?: string;
  dc_room?: string;
  allocation?: AllocationType;
  status: string;
  device_type: DeviceType;
  warranty?: string;
  notes?: string;
  environment?: EnvironmentType;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const ServerInventory = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterEnvironment, setFilterEnvironment] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterAllocation, setFilterAllocation] = useState<string>("all");
  const [filterOS, setFilterOS] = useState<string>("all");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [formData, setFormData] = useState<Omit<Server, 'id' | 'created_at' | 'updated_at' | 'created_by'>>({
    hostname: "",
    serial_number: "",
    brand: "",
    model: "",
    ip_address: "",
    ip_oob: "",
    operating_system: "",
    dc_site: "",
    dc_building: "",
    dc_floor: "",
    dc_room: "",
    allocation: undefined,
    status: "Active",
    device_type: "Server" as DeviceType,
    warranty: "",
    notes: "",
    environment: undefined
  });

  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole('engineer');

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    filterServers();
  }, [servers, searchTerm, filterType, filterEnvironment, filterBrand, filterModel, filterAllocation, filterOS, filterSite, filterBuilding]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) {
        console.error('Error fetching servers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch server inventory",
          variant: "destructive",
        });
        return;
      }

      setServers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterServers = () => {
    let filtered = servers;

    if (searchTerm) {
      filtered = filtered.filter(server =>
        server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.dc_site?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.operating_system?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.dc_building?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.dc_floor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.dc_room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (server.allocation?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(server => server.device_type === filterType);
    }

    if (filterEnvironment !== "all") {
      filtered = filtered.filter(server => server.environment === filterEnvironment);
    }

    if (filterBrand !== "all") {
      filtered = filtered.filter(server => server.brand === filterBrand);
    }

    if (filterModel !== "all") {
      filtered = filtered.filter(server => server.model === filterModel);
    }

    if (filterAllocation !== "all") {
      filtered = filtered.filter(server => server.allocation === filterAllocation);
    }

    if (filterOS !== "all") {
      filtered = filtered.filter(server => server.operating_system === filterOS);
    }

    if (filterSite !== "all") {
      filtered = filtered.filter(server => server.dc_site === filterSite);
    }

    if (filterBuilding !== "all") {
      filtered = filtered.filter(server => server.dc_building === filterBuilding);
    }

    setFilteredServers(filtered);
  };

  const resetForm = () => {
    setFormData({
      hostname: "",
      serial_number: "",
      brand: "",
      model: "",
      ip_address: "",
      ip_oob: "",
      operating_system: "",
      dc_site: "",
      dc_building: "",
      dc_floor: "",
      dc_room: "",
      allocation: undefined,
      status: "Active",
      device_type: "Server" as DeviceType,
      warranty: "",
      notes: "",
      environment: undefined
    });
    setEditingServer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast({
        title: "Permission Denied",
        description: "You need engineer permissions to manage servers",
        variant: "destructive",
      });
      return;
    }

    if (!formData.hostname || !formData.device_type || !formData.dc_site) {
      toast({
        title: "Validation Error",
        description: "Hostname, Device Type, and DC Site are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const serverData = {
        hostname: formData.hostname,
        serial_number: formData.serial_number || null,
        brand: formData.brand || null,
        model: formData.model || null,
        ip_address: formData.ip_address || null,
        ip_oob: formData.ip_oob || null,
        operating_system: formData.operating_system || null,
        dc_site: formData.dc_site,
        dc_building: formData.dc_building || null,
        dc_floor: formData.dc_floor || null,
        dc_room: formData.dc_room || null,
        allocation: formData.allocation || null,
        status: formData.status,
        device_type: formData.device_type,
        warranty: formData.warranty || null,
        notes: formData.notes || null,
        environment: formData.environment || null
      };

      if (editingServer) {
        const { error } = await supabase
          .from('servers')
          .update(serverData)
          .eq('id', editingServer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Server updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('servers')
          .insert(serverData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Server added successfully",
        });
      }

      setIsAddDialogOpen(false);
      resetForm();
      fetchServers();
    } catch (error) {
      console.error('Error saving server:', error);
      toast({
        title: "Error",
        description: "Failed to save server",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData({
      hostname: server.hostname,
      serial_number: server.serial_number || "",
      brand: server.brand || "",
      model: server.model || "",
      ip_address: server.ip_address || "",
      ip_oob: server.ip_oob || "",
      operating_system: server.operating_system || "",
      dc_site: server.dc_site,
      dc_building: server.dc_building || "",
      dc_floor: server.dc_floor || "",
      dc_room: server.dc_room || "",
      allocation: server.allocation,
      status: server.status,
      device_type: server.device_type,
      warranty: server.warranty || "",
      notes: server.notes || "",
      environment: server.environment
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasRole('super_admin')) {
      toast({
        title: "Permission Denied",
        description: "You need super admin permissions to delete servers",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this server?")) return;

    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Server deleted successfully",
      });
      fetchServers();
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  const getDeviceTypeBadge = (type: DeviceType) => {
    const variants = {
      'Server': 'default',
      'Storage': 'secondary',
      'Network': 'outline'
    } as const;
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  const getEnvironmentBadge = (env?: EnvironmentType) => {
    if (!env) return null;
    const variants = {
      'Production': 'destructive',
      'Pre-Production': 'default',
      'Testing': 'secondary',
      'Development': 'outline'
    } as const;
    return <Badge variant={variants[env]}>{env}</Badge>;
  };

  const getAllocationBadge = (allocation?: AllocationType) => {
    if (!allocation) return null;
    return <Badge variant="outline">{allocation}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server Inventory</CardTitle>
          <CardDescription>Loading server inventory...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Server Inventory</CardTitle>
            <CardDescription>
              Manage your data center server inventory with detailed properties
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Server
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingServer ? 'Edit Server' : 'Add New Server'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingServer ? 'Update server information' : 'Add a new server to the inventory'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostname">Hostname *</Label>
                      <Input
                        id="hostname"
                        value={formData.hostname}
                        onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                        placeholder="server-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Serial Number</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        placeholder="SN123456789"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Dell, HPE, Cisco..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="PowerEdge R740, ProLiant DL380..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip_address">IP Address</Label>
                      <Input
                        id="ip_address"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip_oob">OOB/IPMI IP</Label>
                      <Input
                        id="ip_oob"
                        value={formData.ip_oob}
                        onChange={(e) => setFormData({ ...formData, ip_oob: e.target.value })}
                        placeholder="192.168.1.100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="operating_system">Operating System</Label>
                      <Input
                        id="operating_system"
                        value={formData.operating_system}
                        onChange={(e) => setFormData({ ...formData, operating_system: e.target.value })}
                        placeholder="Ubuntu 22.04, Windows Server 2022..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device_type">Device Type *</Label>
                      <Select
                        value={formData.device_type}
                        onValueChange={(value) => setFormData({ ...formData, device_type: value as DeviceType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select device type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Server">Server</SelectItem>
                          <SelectItem value="Storage">Storage</SelectItem>
                          <SelectItem value="Network">Network</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dc_site">DC Site *</Label>
                      <Input
                        id="dc_site"
                        value={formData.dc_site}
                        onChange={(e) => setFormData({ ...formData, dc_site: e.target.value })}
                        placeholder="DC1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_building">DC Building</Label>
                      <Input
                        id="dc_building"
                        value={formData.dc_building}
                        onChange={(e) => setFormData({ ...formData, dc_building: e.target.value })}
                        placeholder="Building A"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dc_floor">DC Floor</Label>
                      <Input
                        id="dc_floor"
                        value={formData.dc_floor}
                        onChange={(e) => setFormData({ ...formData, dc_floor: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_room">DC Room</Label>
                      <Input
                        id="dc_room"
                        value={formData.dc_room}
                        onChange={(e) => setFormData({ ...formData, dc_room: e.target.value })}
                        placeholder="Server Room 101"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allocation">Allocation</Label>
                      <Select
                        value={formData.allocation || ''}
                        onValueChange={(value) => setFormData({ ...formData, allocation: value as AllocationType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select allocation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IAAS">IaaS</SelectItem>
                          <SelectItem value="PAAS">PaaS</SelectItem>
                          <SelectItem value="SAAS">SaaS</SelectItem>
                          <SelectItem value="Load Balancer">Load Balancer</SelectItem>
                          <SelectItem value="Database">Database</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Select
                        value={formData.environment || ''}
                        onValueChange={(value) => setFormData({ ...formData, environment: value as EnvironmentType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Production">Production</SelectItem>
                          <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                          <SelectItem value="Testing">Testing</SelectItem>
                          <SelectItem value="Development">Development</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warranty">Warranty Information</Label>
                    <Input
                      id="warranty"
                      value={formData.warranty}
                      onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                      placeholder="Warranty details..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingServer ? 'Update Server' : 'Add Server'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search all fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Device Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Device Types</SelectItem>
                  <SelectItem value="Server">Server</SelectItem>
                  <SelectItem value="Storage">Storage</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
                <SelectTrigger>
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                  <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="Dell">Dell</SelectItem>
                  <SelectItem value="HPE">HPE</SelectItem>
                  <SelectItem value="Cisco">Cisco</SelectItem>
                  <SelectItem value="Juniper">Juniper</SelectItem>
                  <SelectItem value="NetApp">NetApp</SelectItem>
                  <SelectItem value="Huawei">Huawei</SelectItem>
                  <SelectItem value="Inspur">Inspur</SelectItem>
                  <SelectItem value="Kaytus">Kaytus</SelectItem>
                  <SelectItem value="ZTE">ZTE</SelectItem>
                  <SelectItem value="Meta Brain">Meta Brain</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="PowerEdge R740">PowerEdge R740</SelectItem>
                  <SelectItem value="PowerEdge R750">PowerEdge R750</SelectItem>
                  <SelectItem value="PowerEdge R750xd">PowerEdge R750xd</SelectItem>
                  <SelectItem value="PowerVault ME4">PowerVault ME4</SelectItem>
                  <SelectItem value="ProLiant DL380">ProLiant DL380</SelectItem>
                  <SelectItem value="ProLiant DL360">ProLiant DL360</SelectItem>
                  <SelectItem value="Apollo 4510">Apollo 4510</SelectItem>
                  <SelectItem value="ASA 5525-X">ASA 5525-X</SelectItem>
                  <SelectItem value="Nexus 93180YC-EX">Nexus 93180YC-EX</SelectItem>
                  <SelectItem value="MX204">MX204</SelectItem>
                  <SelectItem value="AFF A400">AFF A400</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAllocation} onValueChange={setFilterAllocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Allocation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Allocations</SelectItem>
                  <SelectItem value="IAAS">IaaS</SelectItem>
                  <SelectItem value="PAAS">PaaS</SelectItem>
                  <SelectItem value="SAAS">SaaS</SelectItem>
                  <SelectItem value="Load Balancer">Load Balancer</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterOS} onValueChange={setFilterOS}>
                <SelectTrigger>
                  <SelectValue placeholder="Operating System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OS</SelectItem>
                  <SelectItem value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</SelectItem>
                  <SelectItem value="Ubuntu 20.04 LTS">Ubuntu 20.04 LTS</SelectItem>
                  <SelectItem value="RHEL 8">RHEL 8</SelectItem>
                  <SelectItem value="CentOS 7">CentOS 7</SelectItem>
                  <SelectItem value="Oracle Linux 8">Oracle Linux 8</SelectItem>
                  <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                  <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                  <SelectItem value="Storage OS 2.1">Storage OS 2.1</SelectItem>
                  <SelectItem value="Cisco ASA 9.16">Cisco ASA 9.16</SelectItem>
                  <SelectItem value="NX-OS 9.3">NX-OS 9.3</SelectItem>
                  <SelectItem value="JunOS 21.2">JunOS 21.2</SelectItem>
                  <SelectItem value="ONTAP 9.10">ONTAP 9.10</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSite} onValueChange={setFilterSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  <SelectItem value="DC-East">DC-East</SelectItem>
                  <SelectItem value="DC-West">DC-West</SelectItem>
                  <SelectItem value="DC-North">DC-North</SelectItem>
                  <SelectItem value="DC-South">DC-South</SelectItem>
                  <SelectItem value="DC-Central">DC-Central</SelectItem>
                  <SelectItem value="DC1">DC1</SelectItem>
                  <SelectItem value="DC2">DC2</SelectItem>
                  <SelectItem value="DC3">DC3</SelectItem>
                  <SelectItem value="DC4">DC4</SelectItem>
                  <SelectItem value="DC5">DC5</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  <SelectItem value="Building-A">Building A</SelectItem>
                  <SelectItem value="Building-B">Building B</SelectItem>
                  <SelectItem value="Building-C">Building C</SelectItem>
                  <SelectItem value="Building-D">Building D</SelectItem>
                  <SelectItem value="Building-E">Building E</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Server Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hostname</TableHead>
              <TableHead>Serial #</TableHead>
              <TableHead>Brand/Model</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Warranty</TableHead>
              {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 11 : 10} className="text-center py-8 text-gray-500">
                  {servers.length === 0 ? "No servers found. Add your first server!" : "No servers match your search criteria."}
                </TableCell>
              </TableRow>
            ) : (
              filteredServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.hostname}</TableCell>
                  <TableCell className="font-mono text-xs">{server.serial_number || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{server.brand || '-'}</span>
                      <span className="text-xs text-muted-foreground">{server.model || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{server.ip_address || '-'}</span>
                      {server.ip_oob && (
                        <span className="text-xs text-muted-foreground">OOB: {server.ip_oob}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getDeviceTypeBadge(server.device_type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{server.dc_site}</span>
                      <span className="text-xs text-muted-foreground">
                        {[server.dc_building, server.dc_floor, server.dc_room].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getAllocationBadge(server.allocation)}</TableCell>
                  <TableCell>
                    <Badge variant={server.status === 'Active' ? 'default' : 'secondary'}>
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{getEnvironmentBadge(server.environment)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {server.warranty || '-'}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(server)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(server.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Summary */}
        <div className="mt-6 text-sm text-gray-600">
          <div>Total Servers: {filteredServers.length}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerInventory;