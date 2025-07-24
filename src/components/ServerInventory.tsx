import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Filter, CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useServerEnums } from "@/hooks/useServerEnums";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Import types from enums
import type { 
  ServerStatus,
  DeviceType,
  EnvironmentType,
  AllocationType,
  ServerEnums
} from '@/types/enums';

interface Server {
  id: string;
  serial_number: string | null;
  hostname: string;
  brand: string | null;
  model: string | null;
  ip_address: string | null;
  ip_oob: string | null;
  operating_system: string | null;
  dc_site: string;
  dc_building: string | null;
  dc_floor: string | null;
  dc_room: string | null;
  rack: string | null;
  unit: string | null;  // Starting unit (e.g., "U1")
  unit_height: number;  // Height in U (e.g., 1, 2, 4, etc.)
  allocation: AllocationType | null;
  status: ServerStatus;
  device_type: DeviceType;
  warranty: string | null;
  notes: string | null;
  environment: EnvironmentType | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Form validation schema with proper enum types
const serverFormSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required'),
  serial_number: z.string().min(1, 'Serial number is required'),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  ip_address: z.string().optional(),
  ip_oob: z.string().optional(),
  operating_system: z.string().optional().nullable(),
  dc_site: z.string().min(1, 'DC site is required'),
  dc_building: z.string().optional().nullable(),
  dc_floor: z.string().optional(),
  dc_room: z.string().optional(),
  rack: z.string().nullable(),
  unit: z.string().nullable(),
  unit_height: z.number().min(1, 'Height must be at least 1U').max(10, 'Maximum height is 10U'),
  allocation: z.string().optional().nullable(),
  status: z.string().min(1, 'Status is required'),
  device_type: z.string().min(1, 'Device type is required'),
  warranty: z.string().optional(),
  notes: z.string().optional(),
  environment: z.string().optional().nullable(),
});

const ServerInventory = () => {
  // State for server data
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for form and UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [warrantyDate, setWarrantyDate] = useState<Date | undefined>(undefined);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  
  // Get dynamic enums and auth
  const { enums } = useServerEnums();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterEnvironment, setFilterEnvironment] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterAllocation, setFilterAllocation] = useState<string>("all");
  const [filterOS, setFilterOS] = useState<string>("all");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterRack, setFilterRack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServers = filteredServers.slice(indexOfFirstItem, indexOfLastItem);
  
  // Form data type with proper validation rules
  interface ServerFormData {
    hostname: string;
    serial_number: string;
    brand: string | null;
    model: string | null;
    ip_address: string;
    ip_oob: string;
    operating_system: string | null;
    dc_site: string;
    dc_building: string | null;
    dc_floor: string;
    dc_room: string;
    rack: string | null;
    unit: string | null;
    unit_height: number;
    allocation: AllocationType | null;
    status: ServerStatus;
    device_type: DeviceType;
    warranty: string;
    notes: string;
    environment: EnvironmentType | null;
  }

  // Get default form values based on enums
  const getInitialFormData = useCallback((enums: ServerEnums | null): ServerFormData => ({
    hostname: '',
    serial_number: '',
    brand: enums?.brands?.[0] || null,
    model: enums?.models?.[0] || null,
    ip_address: '',
    ip_oob: '',
    operating_system: enums?.osTypes?.[0] || null,
    dc_site: enums?.sites?.[0] || '',
    dc_building: enums?.buildings?.[0] || null,
    dc_floor: '',
    dc_room: '',
    rack: enums?.racks?.[0] || null,
    unit: enums?.units?.[0] || null,
    unit_height: 1,
    allocation: (enums?.allocationTypes?.[0] as AllocationType) || null,
    status: (enums?.status?.[0] as ServerStatus) || 'Active',
    device_type: (enums?.deviceTypes?.[0] as DeviceType) || 'Server',
    warranty: '',
    notes: '',
    environment: (enums?.environmentTypes?.[0] as EnvironmentType) || null,
  }), []);

  // Get available units based on rack and height
  const getAvailableUnits = useCallback((selectedRack: string | null, currentServerId: string | null, servers: Server[], requiredHeight = 1): string[] => {
    if (!selectedRack) return [];
    
    // Get all servers in the same rack (excluding current server if editing)
    const rackServers = servers.filter(server => 
      server.rack === selectedRack && 
      server.id !== currentServerId
    );

    // Create a map of occupied units
    const occupied = new Set<string>();
    rackServers.forEach(server => {
      const startUnit = parseInt(server.unit?.substring(1) || '0');
      const height = server.unit_height || 1;
      for (let i = 0; i < height; i++) {
        occupied.add(`U${startUnit + i}`);
      }
    });

    // Filter available units that have enough consecutive space
    return (enums?.units || []).filter(unit => {
      const startUnit = parseInt(unit.substring(1));
      for (let i = 0; i < requiredHeight; i++) {
        if (occupied.has(`U${startUnit + i}`)) return false;
      }
      return true;
    });
  }, [enums?.units]);

  // Initialize form with react-hook-form
  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: getInitialFormData(enums),
  });
  
  // Watch form values for real-time validation (commented out as it's not currently used)
  // const formValues = form.watch();

  // Update available units when rack or height changes
  useEffect(() => {
    const units = getAvailableUnits(
      form.getValues('rack'), 
      editingServer?.id || null, 
      servers, 
      form.getValues('unit_height')
    );
    setAvailableUnits(units);
    
    // Reset unit if current selection is no longer valid
    const currentUnit = form.getValues('unit');
    if (currentUnit && !units.includes(currentUnit)) {
      form.setValue('unit', units[0] || null);
    }
  }, [form, getAvailableUnits, editingServer?.id, servers]);

  // Helper to show unit range in dropdown
  const getUnitRange = (startUnit: string, height: number) => {
    const start = parseInt(startUnit.substring(1));
    const end = start + (height - 1);
    return height > 1 ? ` (U${start}-U${end})` : '';
  };

  // Reset form to default values
  const resetForm = useCallback(() => {
    form.reset(getInitialFormData(enums));
    setEditingServer(null);
    setWarrantyDate(undefined);
  }, [form, enums, getInitialFormData]);
  
  // Update form when enums are loaded or when editing server changes
  useEffect(() => {
    if (enums) {
      const formData = getInitialFormData(enums);
      if (editingServer) {
        // If editing, create a new object with all required fields
        const serverData: ServerFormData = {
          ...formData,
          // Only include fields that are part of ServerFormData
          hostname: editingServer.hostname || '',
          serial_number: editingServer.serial_number || '',
          brand: editingServer.brand || null,
          model: editingServer.model || null,
          ip_address: editingServer.ip_address || '',
          ip_oob: editingServer.ip_oob || '',
          operating_system: editingServer.operating_system || null,
          dc_site: editingServer.dc_site || '',
          dc_building: editingServer.dc_building || null,
          dc_floor: editingServer.dc_floor || '',
          dc_room: editingServer.dc_room || '',
          rack: editingServer.rack || null,
          unit: editingServer.unit || null,
          unit_height: editingServer.unit_height || 1,
          allocation: editingServer.allocation || null,
          status: editingServer.status || 'Active',
          device_type: editingServer.device_type || 'Server',
          warranty: editingServer.warranty || '',
          notes: editingServer.notes || '',
          environment: editingServer.environment || null,
        };
        
        form.reset(serverData);
        
        // Set warranty date if exists
        if (editingServer.warranty) {
          try {
            setWarrantyDate(new Date(editingServer.warranty));
          } catch (e) {
            console.error('Invalid warranty date:', editingServer.warranty);
            setWarrantyDate(undefined);
          }
        } else {
          setWarrantyDate(undefined);
        }
      } else {
        // Otherwise use default values
        form.reset(formData);
        setWarrantyDate(undefined);
      }
    }
  }, [enums, editingServer, form, getInitialFormData]);

  // Get auth and permissions
  const { hasRole } = useAuth();
  const canEdit = hasRole('engineer');

  // Update form when editing a server
  useEffect(() => {
    if (editingServer) {
      // Ensure all required fields have values, even if they're null in the server data
      const serverData: ServerFormData = {
        hostname: editingServer.hostname || '',
        serial_number: editingServer.serial_number || '',
        brand: editingServer.brand || null,
        model: editingServer.model || null,
        ip_address: editingServer.ip_address || '',
        ip_oob: editingServer.ip_oob || '',
        operating_system: editingServer.operating_system || null,
        dc_site: editingServer.dc_site || '',
        dc_building: editingServer.dc_building || null,
        dc_floor: editingServer.dc_floor || '',
        dc_room: editingServer.dc_room || '',
        rack: editingServer.rack || null,
        unit: editingServer.unit || null,
        unit_height: editingServer.unit_height || 1,
        allocation: editingServer.allocation || null,
        status: editingServer.status || 'Active',
        device_type: editingServer.device_type || 'Server',
        warranty: editingServer.warranty || '',
        notes: editingServer.notes || '',
        environment: editingServer.environment || null,
      };
      
      form.reset(serverData);
      
      // Set warranty date if it exists
      if (editingServer.warranty) {
        try {
          setWarrantyDate(new Date(editingServer.warranty));
        } catch (e) {
          console.error('Invalid warranty date:', editingServer.warranty);
          setWarrantyDate(undefined);
        }
      } else {
        setWarrantyDate(undefined);
      }
    } else {
      // Reset to default values when not editing
      form.reset(getInitialFormData(enums));
      setWarrantyDate(undefined);
    }
  }, [editingServer, form, enums, getInitialFormData]);

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    filterServers();
  }, [servers, searchTerm, filterType, filterEnvironment, filterBrand, filterModel, filterAllocation, filterOS, filterSite, filterBuilding, filterRack, filterStatus]);

  // Define the database server type that matches what Supabase returns
  interface DatabaseServer {
    id: string;
    serial_number: string | null;
    hostname: string;
    brand: string | null;
    model: string | null;
    ip_address: string | null;
    ip_oob: string | null;
    operating_system: string | null;
    dc_site: string;
    dc_building: string | null;
    dc_floor: string | null;
    dc_room: string | null;
    rack: string | null;
    unit: string | null;
    unit_height: number;
    allocation: string | null;
    status: string;
    device_type: string;
    warranty: string | null;
    notes: string | null;
    environment: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };

  const fetchServers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the data to Server[] with proper type safety
      const typedData = (data as DatabaseServer[]).map(server => ({
        id: server.id,
        serial_number: server.serial_number || null,
        hostname: server.hostname,
        brand: server.brand,
        model: server.model,
        ip_address: server.ip_address,
        ip_oob: server.ip_oob,
        operating_system: server.operating_system,
        dc_site: server.dc_site,
        dc_building: server.dc_building,
        dc_floor: server.dc_floor,
        dc_room: server.dc_room,
        rack: server.rack,
        unit: server.unit,
        unit_height: server.unit_height,
        allocation: server.allocation as AllocationType | null,
        status: server.status as ServerStatus,
        device_type: server.device_type as DeviceType,
        warranty: server.warranty,
        notes: server.notes,
        environment: server.environment as EnvironmentType | null,
        created_by: server.created_by,
        created_at: server.created_at,
        updated_at: server.updated_at
      } as Server));

      setServers(typedData);
      setFilteredServers(typedData);
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch servers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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

    if (filterRack !== "all") {
      filtered = filtered.filter(server => server.rack === filterRack);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(server => server.status === filterStatus);
    }

    setFilteredServers(filtered);
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    // Don't reset form here - let the useEffect handle it
    setIsAddDialogOpen(true);
  };

  const onSubmit = async (values: ServerFormData) => {
    if (!canEdit) {
      toast({
        title: 'Permission Denied',
        description: 'You need engineer permissions to manage servers',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const serverData: Omit<Server, 'id' | 'created_at' | 'updated_at'> = {
        hostname: values.hostname,
        serial_number: values.serial_number,
        brand: values.brand,
        model: values.model,
        ip_address: values.ip_address,
        ip_oob: values.ip_oob,
        operating_system: values.operating_system,
        dc_site: values.dc_site,
        dc_building: values.dc_building,
        dc_floor: values.dc_floor,
        dc_room: values.dc_room,
        rack: values.rack,
        unit: values.unit,
        unit_height: values.unit_height,
        allocation: values.allocation,
        status: values.status as ServerStatus,
        device_type: values.device_type,
        warranty: values.warranty,
        notes: values.notes,
        environment: values.environment || null,
        created_by: user?.id || null,
      };

      if (editingServer) {
        // Update existing server
        const { error } = await supabase
          .from('servers')
          .update(serverData)
          .eq('id', editingServer.id);

        if (error) throw error;
        
        toast({
          title: 'Server updated',
          description: 'The server has been updated successfully.',
        });
      } else {
        // Create new server
        const { error } = await supabase
          .from('servers')
          .insert([{ 
            ...serverData, 
            created_at: new Date().toISOString() 
          }]);

        if (error) throw error;
        
        toast({
          title: 'Server created',
          description: 'The server has been created successfully.',
        });
      }

      await fetchServers();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving server:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the server.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
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
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingServer ? 'Edit Device' : 'Add New Device'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingServer ? 'Update device information' : 'Add a new device to the inventory'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostname">Hostname *</Label>
                      <Input
                        id="hostname"
                        placeholder="server-001"
                        {...form.register('hostname')}
                        className={form.formState.errors.hostname ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.hostname && (
                        <p className="text-sm text-red-500">{form.formState.errors.hostname.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Serial Number *</Label>
                      <Input
                        id="serial_number"
                        placeholder="SN123456789"
                        {...form.register('serial_number')}
                        className={form.formState.errors.serial_number ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.serial_number && (
                        <p className="text-sm text-red-500">{form.formState.errors.serial_number.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Controller
                        name="brand"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.brands?.map((brand) => (
                                <SelectItem key={brand} value={brand}>
                                  {brand}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Controller
                        name="model"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.models?.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip_address">IP Address</Label>
                      <Input
                        id="ip_address"
                        placeholder="192.168.1.100"
                        {...form.register('ip_address')}
                        className={form.formState.errors.ip_address ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.ip_address && (
                        <p className="text-sm text-red-500">{form.formState.errors.ip_address.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip_oob">OOB/IPMI IP</Label>
                      <Input
                        id="ip_oob"
                        placeholder="192.168.1.100"
                        {...form.register('ip_oob')}
                        className={form.formState.errors.ip_oob ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.ip_oob && (
                        <p className="text-sm text-red-500">{form.formState.errors.ip_oob.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="operating_system">Operating System</Label>
                      <Controller
                        name="operating_system"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select OS" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.osTypes?.map((os) => (
                                <SelectItem key={os} value={os}>
                                  {os}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device_type">Device Type *</Label>
                      <Controller
                        name="device_type"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.deviceTypes?.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dc_site">DC Site *</Label>
                      <Controller
                        name="dc_site"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select site" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.sites?.map((site) => (
                                <SelectItem key={site} value={site}>
                                  {site}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_building">DC Building</Label>
                      <Controller
                        name="dc_building"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select building" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.buildings?.map((building) => (
                                <SelectItem key={building} value={building}>
                                  {building}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dc_floor">DC Floor</Label>
                      <Input
                        id="dc_floor"
                        placeholder="1"
                        {...form.register('dc_floor')}
                        className={form.formState.errors.dc_floor ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.dc_floor && (
                        <p className="text-sm text-red-500">{form.formState.errors.dc_floor.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dc_room">DC Room</Label>
                      <Input
                        id="dc_room"
                        placeholder="Server Room 101"
                        {...form.register('dc_room')}
                        className={form.formState.errors.dc_room ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.dc_room && (
                        <p className="text-sm text-red-500">{form.formState.errors.dc_room.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rack">Rack</Label>
                      <Controller
                        name="rack"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rack" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.racks?.map((rack) => (
                                <SelectItem key={rack} value={rack}>
                                  {rack}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.rack && (
                        <p className="text-sm text-red-500">{form.formState.errors.rack.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Starting Unit</Label>
                      <Controller
                        name="unit"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={!form.getValues('rack') || availableUnits.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !form.getValues('rack') 
                                  ? 'Select rack first' 
                                  : availableUnits.length === 0 
                                    ? 'No space available' 
                                    : 'Select starting unit'
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUnits.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}{getUnitRange(unit, form.getValues('unit_height'))}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.unit && (
                        <p className="text-sm text-red-500">{form.formState.errors.unit.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit_height">Height (U)</Label>
                      <Controller
                        name="unit_height"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => {
                              const newHeight = parseInt(value, 10);
                              field.onChange(newHeight);
                              
                              // Update available units when height changes
                              const units = getAvailableUnits(
                                form.getValues('rack'),
                                editingServer?.id || null,
                                servers,
                                newHeight
                              );
                              setAvailableUnits(units);
                              
                              // Reset unit if current selection is no longer valid
                              const currentUnit = form.getValues('unit');
                              if (currentUnit && !units.includes(currentUnit)) {
                                form.setValue('unit', units[0] || null);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select height" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((height) => {
                                const hasSpace = getAvailableUnits(
                                  form.getValues('rack'),
                                  editingServer?.id || null,
                                  servers,
                                  height
                                ).length > 0;
                                
                                return (
                                  <SelectItem 
                                    key={height} 
                                    value={height.toString()}
                                    disabled={!hasSpace}
                                  >
                                    {height}U {!hasSpace ? '(No space)' : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.unit_height && (
                        <p className="text-sm text-red-500">{form.formState.errors.unit_height.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allocation">Allocation</Label>
                      <Controller
                        name="allocation"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select allocation" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.allocationTypes?.map((allocation) => (
                                <SelectItem key={allocation} value={allocation}>
                                  {allocation}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.allocation && (
                        <p className="text-sm text-red-500">{form.formState.errors.allocation.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Controller
                        name="environment"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select environment" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.environmentTypes?.map((env) => (
                                <SelectItem key={env} value={env}>
                                  {env}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.environment && (
                        <p className="text-sm text-red-500">{form.formState.errors.environment.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Warranty Date</Label>
                    <Controller
                      name="warranty"
                      control={form.control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date?.toISOString().split('T')[0] || '');
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {form.formState.errors.warranty && (
                      <p className="text-sm text-red-500">{form.formState.errors.warranty.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Controller
                        name="status"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {enums?.status?.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.status && (
                        <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        {...form.register('notes')}
                        placeholder="Additional notes..."
                        rows={3}
                        className={cn("min-h-[100px]", form.formState.errors.notes ? 'border-red-500' : '')}
                      />
                      {form.formState.errors.notes && (
                        <p className="text-sm text-red-500">{form.formState.errors.notes.message}</p>
                      )}
                    </div>
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
                  {enums.brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {enums.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAllocation} onValueChange={setFilterAllocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Allocation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Allocations</SelectItem>
                  {enums.allocationTypes.map((allocation) => (
                    <SelectItem key={allocation} value={allocation}>
                      {allocation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterOS} onValueChange={setFilterOS}>
                <SelectTrigger>
                  <SelectValue placeholder="Operating System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OS</SelectItem>
                  {enums.osTypes.map((os) => (
                    <SelectItem key={os} value={os}>
                      {os}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSite} onValueChange={setFilterSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {enums.sites.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {enums.buildings.map((building) => (
                    <SelectItem key={building} value={building}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterRack} onValueChange={setFilterRack}>
                <SelectTrigger>
                  <SelectValue placeholder="Rack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Racks</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={`RACK-${String(i + 1).padStart(2, '0')}`} 
                              value={`RACK-${String(i + 1).padStart(2, '0')}`}>
                      RACK-{String(i + 1).padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {enums.status.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
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
            {currentServers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 11 : 10} className="text-center py-8 text-gray-500">
                  {servers.length === 0 ? "No servers found. Add your first server!" : "No servers match your search criteria."}
                </TableCell>
              </TableRow>
            ) : (
              currentServers.map((server) => (
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
                        {[
                          server.dc_building,
                          server.dc_floor && `Floor ${server.dc_floor}`,
                          server.dc_room && `Room ${server.dc_room}`
                        ].filter(Boolean).join(' • ')}
                      </span>
                      {(server.rack || server.unit) && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {[
                            server.rack && `Rack: ${server.rack}`,
                            server.unit && `Unit: ${server.unit}`,
                            server.unit_height > 1 && `Height: ${server.unit_height}U`
                          ].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>      {server.allocation && getAllocationBadge(server.allocation)}</TableCell>
                  <TableCell>
                    <Badge variant={server.status === 'Active' ? 'default' : 'secondary'}>
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{server.environment && getEnvironmentBadge(server.environment)}</TableCell>
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {Math.min(indexOfFirstItem + 1, filteredServers.length)} to {Math.min(indexOfLastItem, filteredServers.length)} of {filteredServers.length} servers
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ‹
              </Button>
              <div className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                »
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerInventory;