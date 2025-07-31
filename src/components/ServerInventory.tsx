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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Search, Filter, CalendarIcon, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useServerEnums } from "@/hooks/useServerEnums";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Import dynamic form components and hooks
import { useDynamicFormSchema } from "@/hooks/useDynamicFormSchema";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { generateDynamicValidationSchema, generateDefaultValues, transformFormDataForSubmission } from "@/utils/dynamicValidation";
import { useFilterableColumns } from "@/hooks/useFilterableColumns";
import FilterManagerDialog from "@/components/FilterManagerDialog";

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
  // Dynamic properties will be included as additional fields
  [key: string]: any;
}

// Core server fields that are always required (non-dynamic)
const coreServerSchema = z.object({
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

// Zod schema for the "Add Rack" dialog input with enhanced validation
const addRackSchema = z.object({
  rack_name: z.string()
    .min(1, 'Rack name is required')
    .max(50, 'Rack name must be 50 characters or less')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Rack name can only contain letters, numbers, hyphens, and underscores')
    .transform(val => val.trim()),
  dc_site: z.string().min(1, 'Datacenter site is required'),
  dc_building: z.string().min(1, 'Building is required'),
  dc_floor: z.string().min(1, 'Floor is required'),
  dc_room: z.string().min(1, 'Room is required'),
  description: z.string().max(40, 'Description must be 40 characters or less').optional(),
});

const ServerInventory = () => {
  // State for server data
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for form and UI
  const [warrantyDate, setWarrantyDate] = useState<Date | undefined>(undefined);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddRackDialogOpen, setIsAddRackDialogOpen] = useState(false);
  const [isAddingRack, setIsAddingRack] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  // Get dynamic enums, auth, and form schema
  const { enums, addEnumValue, refreshEnums } = useServerEnums();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { formSchema, isLoading: isSchemaLoading, error: schemaError, refetch: refetchSchema } = useDynamicFormSchema();

  // Debug: Log enums when they change
  useEffect(() => {
    console.log('ServerInventory: Current enums:', enums);
    console.log('ServerInventory: Status enums:', enums?.status);
    console.log('ServerInventory: Device types:', enums?.deviceTypes);
  }, [enums]);

  // Check if user has write permissions (engineer or super_admin)
  const canEdit = hasRole('engineer');

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

  // Dynamic filter states
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  const [showFilterManager, setShowFilterManager] = useState(false);

  // Get filterable columns
  const { enabledFilters, refreshPreferences } = useFilterableColumns();

  // Calculate pagination
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServers = filteredServers.slice(indexOfFirstItem, indexOfLastItem);

  // Generate combined validation schema (core + dynamic)
  const combinedValidationSchema = useCallback(() => {
    if (!formSchema.fields.length) {
      return coreServerSchema;
    }

    const dynamicSchema = formSchema.validationSchema;
    return coreServerSchema.merge(dynamicSchema);
  }, [formSchema]);

  // Generate combined default values (core + dynamic)
  const getCombinedDefaultValues = useCallback(() => {
    const coreDefaults = {
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
    };

    return { ...coreDefaults, ...formSchema.defaultValues };
  }, [enums, formSchema.defaultValues]);

  // Helper to determine available units in a rack
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

  // Initialize form for server management with react-hook-form
  const form = useForm({
    resolver: zodResolver(combinedValidationSchema()),
    defaultValues: getCombinedDefaultValues(),
  });

  // Initialize form for "Add Rack" dialog
  const {
    register: registerRack,
    handleSubmit: handleRackSubmit,
    formState: { errors: rackErrors },
    reset: resetRackForm,
  } = useForm<{ 
    rack_name: string; 
    dc_site: string; 
    dc_building: string; 
    dc_floor: string; 
    dc_room: string; 
    description?: string; 
  }>({
    resolver: zodResolver(addRackSchema),
    defaultValues: {
      rack_name: '',
      dc_site: 'DC-East',
      dc_building: 'Building-A',
      dc_floor: '1',
      dc_room: 'MDF',
      description: '',
    },
  });

  // Effect to update available units when rack or height changes in the server form
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

  // Reset server form to default values
  const resetForm = useCallback(() => {
    const defaultValues = getCombinedDefaultValues();
    form.reset(defaultValues);
    setEditingServer(null);
    setWarrantyDate(undefined);
  }, [form, getCombinedDefaultValues]);

  // Effect to update form schema and reset form when schemas change
  useEffect(() => {
    if (!isSchemaLoading && formSchema.fields.length >= 0) {
      // Update form resolver with new combined schema
      const newResolver = zodResolver(combinedValidationSchema());
      form.resolver = newResolver;
      
      // Reset form with new default values if not editing
      if (!editingServer) {
        const defaultValues = getCombinedDefaultValues();
        form.reset(defaultValues);
      }
    }
  }, [formSchema, isSchemaLoading, combinedValidationSchema, getCombinedDefaultValues, form, editingServer]);

  // Effect to update server form when enums are loaded or when editing server changes
  useEffect(() => {
    if (enums && !isSchemaLoading) {
      const defaultValues = getCombinedDefaultValues();
      
      if (editingServer) {
        // If editing, merge server data with defaults
        const serverData = {
          ...defaultValues,
          // Core server fields
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

        // Add dynamic properties
        formSchema.fields.forEach(field => {
          if (editingServer[field.key] !== undefined) {
            serverData[field.key] = editingServer[field.key];
          }
        });

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
        form.reset(defaultValues);
        setWarrantyDate(undefined);
      }
    }
  }, [enums, editingServer, form, getCombinedDefaultValues, formSchema, isSchemaLoading]);

  // Fetch servers on component mount
  useEffect(() => {
    fetchServers();
  }, []);

  // Listen for enum updates from other components
  useEffect(() => {
    const handleEnumsUpdated = (event: CustomEvent) => {
      console.log('ServerInventory: Received enum update event', event.detail);
      // Refresh the form schema when enums are updated
      refetchSchema();
      // Also refresh filter preferences to update filter options
      refreshPreferences();
    };

    window.addEventListener('enumsUpdated', handleEnumsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('enumsUpdated', handleEnumsUpdated as EventListener);
    };
  }, [refetchSchema, refreshPreferences]);

  // Listen for schema updates (like new enum columns added)
  useEffect(() => {
    const handleSchemaUpdated = (event: CustomEvent) => {
      console.log('ServerInventory: Received schema update event', event.detail);
      // Refresh the form schema when new columns are added
      refetchSchema();
    };

    window.addEventListener('schemaUpdated', handleSchemaUpdated as EventListener);
    
    return () => {
      window.removeEventListener('schemaUpdated', handleSchemaUpdated as EventListener);
    };
  }, [refetchSchema]);

  // Filter servers whenever main server data or filter states change
  useEffect(() => {
    filterServers();
  }, [servers, searchTerm, filterType, filterEnvironment, filterBrand, filterModel, filterAllocation, filterOS, filterSite, filterBuilding, filterRack, filterStatus, dynamicFilters]);

  // Listen for filter preference updates
  useEffect(() => {
    const handleFilterPreferencesUpdated = () => {
      refreshPreferences();
    };

    window.addEventListener('filterPreferencesUpdated', handleFilterPreferencesUpdated);
    return () => {
      window.removeEventListener('filterPreferencesUpdated', handleFilterPreferencesUpdated);
    };
  }, [refreshPreferences]);

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
    // Dynamic properties will be included as additional fields
    [key: string]: any;
  }

  // Function to fetch server data from Supabase
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
        updated_at: server.updated_at,
        // Include any additional dynamic properties
        ...Object.keys(server).reduce((acc, key) => {
          if (!['id', 'serial_number', 'hostname', 'brand', 'model', 'ip_address', 'ip_oob', 'operating_system', 
                'dc_site', 'dc_building', 'dc_floor', 'dc_room', 'rack', 'unit', 'unit_height', 'allocation', 
                'status', 'device_type', 'warranty', 'notes', 'environment', 'created_by', 'created_at', 'updated_at'].includes(key)) {
            acc[key] = server[key];
          }
          return acc;
        }, {} as Record<string, any>)
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

  // Function to filter servers based on search term and dropdown selections
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

    // Apply dynamic filters for new enum columns
    Object.entries(dynamicFilters).forEach(([columnKey, value]) => {
      if (value !== "all" && value !== "") {
        filtered = filtered.filter(server => server[columnKey] === value);
      }
    });

    setFilteredServers(filtered);
  };

  // Function to clear all filters and reset to default state
  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterEnvironment("all");
    setFilterBrand("all");
    setFilterModel("all");
    setFilterAllocation("all");
    setFilterOS("all");
    setFilterSite("all");
    setFilterBuilding("all");
    setFilterRack("all");
    setFilterStatus("all");
    setDynamicFilters({}); // Clear dynamic filters
    setCurrentPage(1);
  };

  // Handler for editing an existing server
  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setIsAddDialogOpen(true);
  };

  // Handler for submitting the server add/edit form
  const onSubmit = async (values: any) => {
    // Permission check: Only engineers can add/edit servers
    if (!hasRole('engineer')) {
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

      // Transform form data for submission (handles dynamic properties)
      const transformedData = transformFormDataForSubmission(values, formSchema.fields);

      // Prepare server data for Supabase insert/update
      const serverData = {
        // Core fields
        hostname: transformedData.hostname,
        serial_number: transformedData.serial_number,
        brand: transformedData.brand,
        model: transformedData.model,
        ip_address: transformedData.ip_address,
        ip_oob: transformedData.ip_oob,
        operating_system: transformedData.operating_system,
        dc_site: transformedData.dc_site,
        dc_building: transformedData.dc_building,
        dc_floor: transformedData.dc_floor,
        dc_room: transformedData.dc_room,
        rack: transformedData.rack,
        unit: transformedData.unit,
        unit_height: transformedData.unit_height,
        allocation: transformedData.allocation,
        status: transformedData.status as ServerStatus,
        device_type: transformedData.device_type,
        warranty: transformedData.warranty,
        notes: transformedData.notes,
        environment: transformedData.environment || null,
        created_by: user?.id || null,
        // Include dynamic properties
        ...formSchema.fields.reduce((acc, field) => {
          if (transformedData[field.key] !== undefined) {
            acc[field.key] = transformedData[field.key];
          }
          return acc;
        }, {} as Record<string, any>)
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

      await fetchServers(); // Refresh server list
      setIsAddDialogOpen(false); // Close dialog
      resetForm(); // Reset form fields
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

  // Handler for deleting a server
  const handleDelete = async (id: string) => {
    // Permission check: Only super_admin can delete servers
    if (!hasRole('super_admin')) {
      toast({
        title: "Permission Denied",
        description: "You need super admin permissions to delete servers",
        variant: "destructive",
      });
      return;
    }

    // Confirmation dialog (using browser's confirm for simplicity, consider custom modal for better UX)
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
      fetchServers(); // Refresh server list
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  // Helper function to get device type badge variant
  const getDeviceTypeBadge = (type: DeviceType) => {
    const variants = {
      'Server': 'default',
      'Storage': 'secondary',
      'Network': 'outline'
    } as const;
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  // Helper function to get environment badge variant
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

  // Helper function to get allocation badge variant
  const getAllocationBadge = (allocation?: AllocationType) => {
    if (!allocation) return null;
    return <Badge variant="outline">{allocation}</Badge>;
  };

  // Function to handle "Add Rack" form submission
  const onAddRackSubmit = async (values: { 
    rack_name: string; 
    dc_site: string; 
    dc_building: string; 
    dc_floor: string; 
    dc_room: string; 
    description?: string; 
  }) => {
    // Permission check: Assuming engineer role can add racks
    if (!hasRole('engineer')) {
      toast({
        title: 'Permission Denied',
        description: 'You need engineer permissions to add racks',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingRack(true);
    try {
      // Step 1: Add the new rack to the PostgreSQL enum
      const enumSuccess = await addEnumValue('rack', values.rack_name.trim());
      
      if (!enumSuccess) {
        throw new Error('Failed to add rack to enum');
      }

      // Step 2: Create rack metadata entry in rack_metadata table using our API
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = import.meta.env.VITE_SUPABASE_URL ? 
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/main` : 
        'http://localhost:8000/functions/v1/main';

      const metadataResponse = await fetch(`${apiUrl}/api/racks/${values.rack_name.trim()}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ 
          description: values.description || '',
          dc_site: values.dc_site,
          dc_building: values.dc_building,
          dc_floor: values.dc_floor,
          dc_room: values.dc_room,
          total_units: 42
        })
      });

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error('Error creating rack metadata:', errorText);
        toast({
          title: "Rack added with warning",
          description: `Rack "${values.rack_name}" was added to the system, but metadata creation failed. Please contact support.`,
          variant: 'default',
        });
      } else {
        toast({
          title: "Rack added successfully",
          description: `Rack "${values.rack_name}" has been added to the system with metadata.`,
        });
      }
      
      setIsAddRackDialogOpen(false); // Close the dialog
      resetRackForm(); // Reset the rack form for next use
      
      // Refresh enums to update the UI
      await refreshEnums();
      
    } catch (error) {
      console.error('Error adding rack:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error adding rack',
        description: `Failed to add rack: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsAddingRack(false);
    }
  };

  // Display loading state
  if (isLoading || isSchemaLoading) {
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

  // Display schema error if any
  if (schemaError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server Inventory</CardTitle>
          <CardDescription>Error loading form schema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            <p>Failed to load dynamic form schema: {schemaError}</p>
            <Button onClick={refetchSchema} className="mt-2">
              Retry
            </Button>
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
              {formSchema.fields.length > 0 && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Dynamic properties: {formSchema.fields.length} field{formSchema.fields.length !== 1 ? 's' : ''} configured
                </span>
              )}
            </CardDescription>
          </div>
          {/* Container for both "Add Rack" and "Add Device" buttons */}
          <div className="flex space-x-2">
            {/* "Add Rack" Button and Dialog */}
            {canEdit && (
              <Dialog open={isAddRackDialogOpen} onOpenChange={setIsAddRackDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetRackForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rack
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Rack</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new rack and its location.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRackSubmit(onAddRackSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rack_name">Rack Name *</Label>
                      <Input
                        id="rack_name"
                        placeholder="e.g., RACK-01"
                        disabled={isAddingRack}
                        {...registerRack('rack_name')}
                        className={rackErrors.rack_name ? 'border-red-500' : ''}
                      />
                      {rackErrors.rack_name && (
                        <p className="text-sm text-red-500">{rackErrors.rack_name.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dc_site">Site *</Label>
                        <select
                          id="dc_site"
                          disabled={isAddingRack}
                          {...registerRack('dc_site')}
                          className={`w-full px-3 py-2 border rounded-md ${rackErrors.dc_site ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          {enums.sites?.map((site) => (
                            <option key={site} value={site}>{site}</option>
                          ))}
                        </select>
                        {rackErrors.dc_site && (
                          <p className="text-sm text-red-500">{rackErrors.dc_site.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dc_building">Building *</Label>
                        <select
                          id="dc_building"
                          disabled={isAddingRack}
                          {...registerRack('dc_building')}
                          className={`w-full px-3 py-2 border rounded-md ${rackErrors.dc_building ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          {enums.buildings?.map((building) => (
                            <option key={building} value={building}>{building}</option>
                          ))}
                        </select>
                        {rackErrors.dc_building && (
                          <p className="text-sm text-red-500">{rackErrors.dc_building.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dc_floor">Floor *</Label>
                        <select
                          id="dc_floor"
                          disabled={isAddingRack}
                          {...registerRack('dc_floor')}
                          className={`w-full px-3 py-2 border rounded-md ${rackErrors.dc_floor ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                        {rackErrors.dc_floor && (
                          <p className="text-sm text-red-500">{rackErrors.dc_floor.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dc_room">Room *</Label>
                        <select
                          id="dc_room"
                          disabled={isAddingRack}
                          {...registerRack('dc_room')}
                          className={`w-full px-3 py-2 border rounded-md ${rackErrors.dc_room ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="MDF">MDF</option>
                          <option value="IDF">IDF</option>
                          <option value="Comms">Comms</option>
                        </select>
                        {rackErrors.dc_room && (
                          <p className="text-sm text-red-500">{rackErrors.dc_room.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Optional description (max 40 chars)"
                        maxLength={40}
                        disabled={isAddingRack}
                        {...registerRack('description')}
                        className={rackErrors.description ? 'border-red-500' : ''}
                      />
                      {rackErrors.description && (
                        <p className="text-sm text-red-500">{rackErrors.description.message}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isAddingRack}
                        onClick={() => {
                          setIsAddRackDialogOpen(false);
                          resetRackForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isAddingRack}>
                        {isAddingRack ? 'Adding...' : 'OK'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* "Add Device" Button and Dialog with Dynamic Form */}
            {canEdit && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingServer ? 'Edit Device' : 'Add New Device'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingServer ? 'Update device information' : 'Add a new device to the inventory'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Core Server Fields */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-medium">Core Information</CardTitle>
                      </CardHeader>
                      <CardContent>
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

                        <div className="grid grid-cols-2 gap-4 mt-4">
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

                        <div className="grid grid-cols-2 gap-4 mt-4">
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

                        <div className="grid grid-cols-2 gap-4 mt-4">
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

                        <div className="grid grid-cols-2 gap-4 mt-4">
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

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="dc_floor">DC Floor</Label>
                            <Input
                              id="dc_floor"
                              placeholder="1"
                              {...form.register('dc_floor')}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dc_room">DC Room</Label>
                            <Input
                              id="dc_room"
                              placeholder="Room A"
                              {...form.register('dc_room')}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4">
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
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Controller
                              name="unit"
                              control={form.control}
                              render={({ field }) => (
                                <Select
                                  value={field.value || ''}
                                  onValueChange={field.onChange}
                                  disabled={!form.getValues('rack')}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableUnits.map((unit) => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}{getUnitRange(unit, form.getValues('unit_height') || 1)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unit_height">Height (U) *</Label>
                            <Controller
                              name="unit_height"
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={field.value || 1}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className={form.formState.errors.unit_height ? 'border-red-500' : ''}
                                />
                              )}
                            />
                            {form.formState.errors.unit_height && (
                              <p className="text-sm text-red-500">{form.formState.errors.unit_height.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
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
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
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
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
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
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="warranty">Warranty</Label>
                            <Controller
                              name="warranty"
                              control={form.control}
                              render={({ field }) => (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !warrantyDate && 'text-muted-foreground'
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {warrantyDate ? format(warrantyDate, 'PPP') : <span>Pick warranty date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={warrantyDate}
                                      onSelect={(date) => {
                                        setWarrantyDate(date);
                                        field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Additional notes..."
                            {...form.register('notes')}
                            className="mt-2"
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Dynamic Properties Section */}
                    {formSchema.fields.length > 0 && (
                      <>
                        <Separator />
                        <DynamicFormRenderer
                          key={`dynamic-form-${formSchema.fields.map(f => f.key + ':' + (f.options?.length || 0)).join('-')}`} // Force re-render when field options change
                          fields={formSchema.fields}
                          control={form.control}
                          errors={form.formState.errors}
                          showCategories={true}
                          columnsPerRow={2}
                        />
                      </>
                    )}

                    <DialogFooter className="mt-6">
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
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : editingServer ? 'Update Device' : 'Add Device'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
              aria-label="Clear all filters and search"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Filters
            </Button>

            {/* Manage Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilterManager(true)}
              className="flex items-center gap-2"
              aria-label="Manage filter columns"
            >
              <Filter className="h-4 w-4" />
              Manage Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Filter Manager Dialog */}
      <FilterManagerDialog
        open={showFilterManager}
        onOpenChange={setShowFilterManager}
        onFiltersUpdated={() => {
          // Refresh the component when filters are updated
          window.location.reload();
        }}
      />

      {/* Rest of the component remains the same - filters, table, pagination */}
      <CardContent>
        {/* Search and Filter Controls */}
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
                  {enums?.deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
                <SelectTrigger>
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  {enums?.environmentTypes?.map((env) => (
                    <SelectItem key={env} value={env}>{env}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {enums?.brands?.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {enums?.models?.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAllocation} onValueChange={setFilterAllocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Allocation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Allocations</SelectItem>
                  {enums?.allocationTypes?.map((allocation) => (
                    <SelectItem key={allocation} value={allocation}>{allocation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterOS} onValueChange={setFilterOS}>
                <SelectTrigger>
                  <SelectValue placeholder="Operating System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OS</SelectItem>
                  {enums?.osTypes?.map((os) => (
                    <SelectItem key={os} value={os}>{os}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSite} onValueChange={setFilterSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {enums?.sites?.map((site) => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {enums?.buildings?.map((building) => (
                    <SelectItem key={building} value={building}>{building}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterRack} onValueChange={setFilterRack}>
                <SelectTrigger>
                  <SelectValue placeholder="Rack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Racks</SelectItem>
                  {enums?.racks?.map((rack) => (
                    <SelectItem key={rack} value={rack}>{rack}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {enums?.status?.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Dynamic Filters */}
              {enabledFilters
                .filter(filter => !filter.isCore && filter.options.length > 0)
                .map((filter) => (
                  <Select 
                    key={filter.key}
                    value={dynamicFilters[filter.key] || "all"} 
                    onValueChange={(value) => setDynamicFilters(prev => ({ ...prev, [filter.key]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filter.displayName} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filter.displayName}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))
              }
            </div>
          </div>
        </div>

        {/* Server Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brand/Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.hostname}</TableCell>
                  <TableCell>{server.serial_number || '-'}</TableCell>
                  <TableCell>{getDeviceTypeBadge(server.device_type)}</TableCell>
                  <TableCell>
                    <Badge variant={server.status === 'Active' ? 'default' : 'secondary'}>
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {server.brand && server.model ? `${server.brand} ${server.model}` : server.brand || server.model || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{server.dc_site}</div>
                      {server.rack && server.unit && (
                        <div className="text-muted-foreground">{server.rack} {server.unit}</div>
                      )}
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
                  <TableCell>{getEnvironmentBadge(server.environment)}</TableCell>
                  <TableCell>{getAllocationBadge(server.allocation)}</TableCell>
                  <TableCell>
                    {server.warranty ? (
                      <div className="text-sm">
                        {format(new Date(server.warranty), 'MMM dd, yyyy')}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(server)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasRole('super_admin') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(server.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredServers.length)} of {filteredServers.length} entries
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
                  {[10, 25, 50, 100].map((size) => (
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
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerInventory;