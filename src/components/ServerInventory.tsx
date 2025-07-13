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

interface Server {
  id: string;
  hostname: string;
  device_type: 'Server' | 'Storage' | 'Network';
  dc_site: string;
  dc_building?: string;
  dc_floor?: string;
  dc_room?: string;
  allocation?: 'IAAS/PAAS' | 'SAAS' | 'Load Balancer' | 'Database';
  environment?: 'Production' | 'Testing' | 'Pre-Production' | 'Development';
  ip_address?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  specifications?: any;
  status: string;
  notes?: string;
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [formData, setFormData] = useState({
    hostname: "",
    device_type: "" as 'Server' | 'Storage' | 'Network' | "",
    dc_site: "",
    dc_building: "",
    dc_floor: "",
    dc_room: "",
    allocation: "" as 'IAAS/PAAS' | 'SAAS' | 'Load Balancer' | 'Database' | "",
    environment: "" as 'Production' | 'Testing' | 'Pre-Production' | 'Development' | "",
    ip_address: "",
    serial_number: "",
    manufacturer: "",
    model: "",
    status: "Active",
    notes: ""
  });

  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole('engineer');

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    filterServers();
  }, [servers, searchTerm, filterType, filterEnvironment]);

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
        server.dc_site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(server => server.device_type === filterType);
    }

    if (filterEnvironment !== "all") {
      filtered = filtered.filter(server => server.environment === filterEnvironment);
    }

    setFilteredServers(filtered);
  };

  const resetForm = () => {
    setFormData({
      hostname: "",
      device_type: "",
      dc_site: "",
      dc_building: "",
      dc_floor: "",
      dc_room: "",
      allocation: "",
      environment: "",
      ip_address: "",
      serial_number: "",
      manufacturer: "",
      model: "",
      status: "Active",
      notes: ""
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
      if (editingServer) {
        const { error } = await supabase
          .from('servers')
          .update({
            hostname: formData.hostname,
            device_type: formData.device_type,
            dc_site: formData.dc_site,
            dc_building: formData.dc_building || null,
            dc_floor: formData.dc_floor || null,
            dc_room: formData.dc_room || null,
            allocation: formData.allocation || null,
            environment: formData.environment || null,
            ip_address: formData.ip_address || null,
            serial_number: formData.serial_number || null,
            manufacturer: formData.manufacturer || null,
            model: formData.model || null,
            status: formData.status,
            notes: formData.notes || null,
          })
          .eq('id', editingServer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Server updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('servers')
          .insert({
            hostname: formData.hostname,
            device_type: formData.device_type,
            dc_site: formData.dc_site,
            dc_building: formData.dc_building || null,
            dc_floor: formData.dc_floor || null,
            dc_room: formData.dc_room || null,
            allocation: formData.allocation || null,
            environment: formData.environment || null,
            ip_address: formData.ip_address || null,
            serial_number: formData.serial_number || null,
            manufacturer: formData.manufacturer || null,
            model: formData.model || null,
            status: formData.status,
            notes: formData.notes || null,
          });

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
      device_type: server.device_type,
      dc_site: server.dc_site,
      dc_building: server.dc_building || "",
      dc_floor: server.dc_floor || "",
      dc_room: server.dc_room || "",
      allocation: server.allocation || "",
      environment: server.environment || "",
      ip_address: server.ip_address || "",
      serial_number: server.serial_number || "",
      manufacturer: server.manufacturer || "",
      model: server.model || "",
      status: server.status,
      notes: server.notes || ""
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

  const getDeviceTypeBadge = (type: string) => {
    const variants = {
      'Server': 'default',
      'Storage': 'secondary',
      'Network': 'outline'
    } as const;
    return <Badge variant={variants[type as keyof typeof variants]}>{type}</Badge>;
  };

  const getEnvironmentBadge = (env?: string) => {
    if (!env) return null;
    const variants = {
      'Production': 'destructive',
      'Pre-Production': 'default',
      'Testing': 'secondary',
      'Development': 'outline'
    } as const;
    return <Badge variant={variants[env as keyof typeof variants]}>{env}</Badge>;
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <Label htmlFor="device_type">Device Type *</Label>
                      <Select
                        value={formData.device_type}
                        onValueChange={(value) => setFormData({ ...formData, device_type: value as 'Server' | 'Storage' | 'Network' })}
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
                        placeholder="Site-A"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_building">DC Building</Label>
                      <Input
                        id="dc_building"
                        value={formData.dc_building}
                        onChange={(e) => setFormData({ ...formData, dc_building: e.target.value })}
                        placeholder="Building-1"
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
                        placeholder="Floor-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_room">DC Room</Label>
                      <Input
                        id="dc_room"
                        value={formData.dc_room}
                        onChange={(e) => setFormData({ ...formData, dc_room: e.target.value })}
                        placeholder="Room-101"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allocation">Allocation</Label>
                      <Select
                        value={formData.allocation}
                        onValueChange={(value) => setFormData({ ...formData, allocation: value as 'IAAS/PAAS' | 'SAAS' | 'Load Balancer' | 'Database' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select allocation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IAAS/PAAS">IAAS/PAAS</SelectItem>
                          <SelectItem value="SAAS">SAAS</SelectItem>
                          <SelectItem value="Load Balancer">Load Balancer</SelectItem>
                          <SelectItem value="Database">Database</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Select
                        value={formData.environment}
                        onValueChange={(value) => setFormData({ ...formData, environment: value as 'Production' | 'Testing' | 'Pre-Production' | 'Development' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Production">Production</SelectItem>
                          <SelectItem value="Testing">Testing</SelectItem>
                          <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                          <SelectItem value="Development">Development</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="Dell, HP, Cisco..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="PowerEdge R740"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
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

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingServer ? 'Update' : 'Add'} Server
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search servers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Device Types</SelectItem>
                <SelectItem value="Server">Server</SelectItem>
                <SelectItem value="Storage">Storage</SelectItem>
                <SelectItem value="Network">Network</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Testing">Testing</SelectItem>
                <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Server Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Device Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-gray-500">
                    {servers.length === 0 ? "No servers found. Add your first server!" : "No servers match your search criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.hostname}</TableCell>
                    <TableCell>{getDeviceTypeBadge(server.device_type)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{server.dc_site}</div>
                        {(server.dc_building || server.dc_floor || server.dc_room) && (
                          <div className="text-gray-500">
                            {[server.dc_building, server.dc_floor, server.dc_room].filter(Boolean).join(' > ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEnvironmentBadge(server.environment)}</TableCell>
                    <TableCell>{server.ip_address || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={server.status === 'Active' ? 'default' : 'secondary'}>
                        {server.status}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(server)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {hasRole('super_admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(server.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
          <div>Total Servers: {filteredServers.length}</div>
          <div>Active: {filteredServers.filter(s => s.status === 'Active').length}</div>
          <div>Production: {filteredServers.filter(s => s.environment === 'Production').length}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerInventory;