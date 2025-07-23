import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Trash2, Edit, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTableSchema } from "@/hooks/useTableSchema";
import EnumManager from "./property-management/EnumManager";
import BulkImport from "./property-management/BulkImport";
import { supabase } from "@/integrations/supabase/client";

export interface ServerProperty {
  id?: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  required: boolean;
  visible: boolean;
  options?: string[];
  is_enum?: boolean;
  isSystem?: boolean; // Indicates if this is a system property that can't be deleted
  column_default?: string | null;
  category?: string;
  default_value?: string;
  description?: string;
}

// Default properties as fallback - these cannot be deleted
const defaultProperties: ServerProperty[] = [
  { id: "1", name: "Hostname", key: "hostname", type: "text", required: true, visible: true, isSystem: true },
  { id: "2", name: "Device Type", key: "device_type", type: "select", required: true, visible: true, options: ["Server", "Storage", "Network"], isSystem: true },
  { id: "3", name: "DC Site", key: "dc_site", type: "text", required: true, visible: true, isSystem: true },
  { id: "4", name: "DC Building", key: "dc_building", type: "text", required: true, visible: true, isSystem: true },
  { id: "5", name: "DC Floor", key: "dc_floor", type: "text", required: true, visible: true, isSystem: true },
  { id: "6", name: "DC Room", key: "dc_room", type: "text", required: true, visible: true, isSystem: true },
  { id: "7", name: "Allocation", key: "allocation", type: "select", required: true, visible: true, options: ["IAAS/PAAS", "SAAS", "Load Balancer", "Database"], isSystem: true },
  { id: "8", name: "Environment", key: "environment", type: "select", required: true, visible: true, options: ["Production", "Testing", "Pre-Production", "Development"], isSystem: true },
  { id: "9", name: "IP Address", key: "ip_address", type: "text", required: true, visible: true, isSystem: true },
  { id: "10", name: "Serial Number", key: "serial_number", type: "text", required: true, visible: true, isSystem: true },
  { id: "11", name: "Brand", key: "brand", type: "select", required: true, visible: true, is_enum: true, options: ["Dell", "HPE", "Cisco", "Juniper", "NetApp", "Huawei", "Inspur", "Kaytus", "ZTE", "Meta Brain"], isSystem: true },
  { id: "12", name: "Model", key: "model", type: "text", required: true, visible: true, isSystem: true },
  { id: "13", name: "Status", key: "status", type: "select", required: true, visible: true, options: ["Active", "Inactive", "Maintenance", "Retired"], isSystem: true },
  { id: "14", name: "Notes", key: "notes", type: "text", required: true, visible: true, isSystem: true },
  { id: "15", name: "Operating System", key: "operating_system", type: "text", required: true, visible: true, isSystem: true },
  { id: "16", name: "Rack", key: "rack", type: "text", required: true, visible: true, isSystem: true },
  { id: "17", name: "Unit", key: "unit", type: "text", required: true, visible: true, isSystem: true },
  { id: "18", name: "Warranty", key: "warranty", type: "date", required: false, visible: true, isSystem: true, description: "Warranty expiration date" }
];

// Columns to exclude from the dynamic schema
export const EXCLUDED_COLUMNS = [
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  'ip_oob', 'hostname', 'ip_address', 'serial_number'
];

const ServerProperties = () => {
  const { columns: tableColumns, error } = useTableSchema('servers');
  const [properties, setProperties] = useState<ServerProperty[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<ServerProperty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newColumn, setNewColumn] = useState<Partial<ServerProperty>>({
    name: "",
    key: "",
    type: "text",
    required: true,
    visible: true,
    options: []
  });
  const { toast } = useToast();

  // Merge dynamic columns with default properties
  useEffect(() => {
    if (tableColumns.length > 0) {
      // Create a map of existing properties by key for quick lookup
      const propertiesMap = new Map<string, ServerProperty>();
      
      // First add all default properties
      defaultProperties.forEach(prop => {
        propertiesMap.set(prop.key, { ...prop });
      });
      
      // Then add or update with dynamic columns
      tableColumns.forEach(column => {
        if (!EXCLUDED_COLUMNS.includes(column.column_name)) {
          const existingProp = propertiesMap.get(column.column_name);
          if (existingProp) {
            // Update existing property with dynamic data
            existingProp.type = column.data_type;
            existingProp.required = column.is_nullable === 'NO';
            if (column.enum_values?.length) {
              existingProp.options = column.enum_values;
              existingProp.is_enum = true;
            }
          } else {
            // Add new property from dynamic columns
            propertiesMap.set(column.column_name, {
              id: `dynamic_${column.column_name}`,
              name: column.column_name
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              key: column.column_name,
              type: column.data_type,
              required: column.is_nullable === 'NO',
              visible: true,
              options: column.enum_values || [],
              is_enum: column.is_enum || false,
              column_default: column.column_default
            });
          }
        }
      });
      
      // Update properties state with merged data
      setProperties(Array.from(propertiesMap.values()));
    }
  }, [tableColumns]);

  // Show error toast if schema loading fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading schema",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const validateColumn = (column: Partial<ServerProperty>) => {
    const errors: Record<string, string> = {};
    
    if (!column.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!column.key?.trim()) {
      errors.key = 'Key is required';
    } else if (!/^[a-z0-9_]+$/.test(column.key)) {
      errors.key = 'Key must be lowercase with underscores (a-z, 0-9, _)';
    }
    
    if (!column.type) {
      errors.type = 'Type is required';
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure required fields are present
    if (!newColumn.name?.trim() || !newColumn.key?.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and key are required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate the form
    const errors = validateColumn(newColumn);
    if (Object.keys(errors).length > 0) {
      // Show the first error
      toast({
        title: "Validation Error",
        description: Object.values(errors)[0],
        variant: "destructive"
      });
      return;
    }
    
    // TypeScript now knows newColumn.key is defined
    const propertyKey = newColumn.key.toLowerCase();
    
    // Check for duplicate keys
    const keyExists = properties.some(p => p.key.toLowerCase() === propertyKey);
    if (keyExists) {
      toast({
        title: "Validation Error",
        description: `A property with the key '${propertyKey}' already exists`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the request body to match the working API call
      const requestBody = {
        name: newColumn.name,
        key: newColumn.key,
        type: newColumn.type,
        description: newColumn.description || `${newColumn.name} property`,
        required: newColumn.required || false,
        options: newColumn.options || [],
        default_value: newColumn.default_value || null
      };

      // Call the property-manager Edge Function to add the column
      const { data, error } = await supabase.functions.invoke('property-manager', {
        method: 'POST',
        body: requestBody
      });

      if (error) throw error;

      if (data) {
        // Extract the property data from the response
        const propertyData = data.data || data;
        
        // Add the new column to the local state
        const column: ServerProperty = {
          id: propertyData.id,
          name: propertyData.name,
          key: propertyData.key,
          type: propertyData.property_type as any,
          required: propertyData.required || false,
          visible: true,
          options: propertyData.options || [],
          is_enum: propertyData.property_type === 'select',
          description: propertyData.description,
          category: propertyData.category || undefined,
          default_value: propertyData.default_value || undefined
        };

        setProperties(prev => [...prev, column]);
        setNewColumn({ name: "", key: "", type: "text", required: true, options: [] });
        setIsAddDialogOpen(false);
        
        // Show success message with the property name from the response
        toast({
          title: "Property Added",
          description: `Successfully added property '${data.data.name}'
          
          Note: Please refresh the page to see the new column in the table.`,
          duration: 5000 // Show for 5 seconds
        });
      } else {
        throw new Error(data?.error || "Failed to add property");
      }
    } catch (err: any) {
      console.error('Error adding column:', err);
      
      let errorMessage = err.message || "Failed to add column";
      
      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        errorMessage = `A column with this key already exists. Please choose a different key.`;
      } else if (errorMessage.includes('reserved SQL keyword')) {
        errorMessage = `Invalid column name: ${errorMessage}`;
      } else if (errorMessage.includes('invalid input syntax')) {
        errorMessage = `Invalid column name. Please use only letters, numbers, and underscores.`;
      }
      
      toast({
        title: "Error Adding Column",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };





  // Removed unused handleRemoveOption function

  const handleTypeChange = (value: string) => {
    setNewColumn((prev: Partial<ServerProperty>) => {
      const updated = {
        ...prev,
        type: value as ServerProperty['type']
      };
      
      // Reset options when type changes to/from select
      if (value === 'select' && !prev.options) {
        updated.options = [];
      } else if (value !== 'select' && prev.options) {
        delete updated.options;
      }
      
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setNewColumn((prev: Partial<ServerProperty>) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('property-manager', {
        method: 'DELETE',
        body: { key: propertyToDelete.key }
      });

      if (error) throw error;

      if (data?.success) {
        // Remove the property from the local state
        setProperties(properties.filter(prop => prop.key !== propertyToDelete.key));
        toast({
          title: "Success",
          description: data.message || "Column deleted successfully"
        });
      } else {
        throw new Error(data?.error || "Failed to delete column");
      }
    } catch (err: any) {
      console.error('Error deleting column:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete column. Please check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const handleBulkImportComplete = async (count: number) => {
    try {
      // Refresh the schema after bulk import
      const { error } = await supabase.functions.invoke('get-table-schema', {
        method: 'GET',
        body: { table: 'servers' }
      });

      if (error) throw error;

      toast({
        title: "Import Complete",
        description: `Successfully imported ${count} servers and refreshed schema`
      });
    } catch (err: any) {
      console.error('Error refreshing schema after import:', err);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${count} servers (schema refresh failed)`
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Server Properties & Management</h2>
          <p className="text-slate-600">Customize server properties and manage data</p>
        </div>
      </div>

      <Tabs defaultValue="properties" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="manage">Manage Options</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Create a new server property to track additional information
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Property Name</Label>
                    <Input
                      id="name"
                      value={newColumn.name || ""}
                      onChange={handleChange}
                      placeholder="e.g., Networks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key">Property Key</Label>
                    <Input
                      id="key"
                      value={newColumn.key || ""}
                      onChange={handleChange}
                      placeholder="e.g., networks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type</Label>
                    <Select 
                      value={newColumn.type || "text"} 
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="required"
                      checked={newColumn.required || false}
                      onCheckedChange={(checked) => setNewColumn(prev => ({
                        ...prev,
                        required: checked
                      }))}
                    />
                    <Label htmlFor="required">Required field</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Property'}
                  </Button>
                </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Configuration</CardTitle>
              <CardDescription>
                Manage which properties are visible and required for servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{property.name}</h4>
                          {property.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{property.type}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Key: {property.key}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                        {property.isSystem && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      {!property.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPropertyToDelete(property);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Column</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the column "{propertyToDelete?.name}"? 
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteProperty}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Column'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <EnumManager 
            properties={properties.map(p => ({
              ...p,
              id: p.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }))} 
            setProperties={(updatedProps) => {
              // Map back to the original properties, preserving original IDs
              const merged = updatedProps.map(up => {
                const original = properties.find(p => p.key === up.key);
                return {
                  ...up,
                  id: original?.id || up.id
                };
              });
              setProperties(merged);
            }} 
          />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <BulkImport onImportComplete={handleBulkImportComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServerProperties;