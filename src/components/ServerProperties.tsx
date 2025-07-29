import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useServerEnums } from "@/hooks/useServerEnums";
import BulkImport from "@/components/property-management/BulkImport";

export interface ServerProperty {
  id?: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "enum";
  required: boolean;
  visible: boolean;
  options?: string[];
  enumType?: string; // For enum type selection
  enumTypeName?: string; // For new enum type creation
  enumValues?: string[]; // For new enum values
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
  const { columns: tableColumns, error, refetch: refreshSchema } = useTableSchema('servers');
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
    options: [],
    enumType: "",
    enumTypeName: "",
    enumValues: []
  });
  const { toast } = useToast();
  const { addEnumValue, refreshEnums } = useServerEnums();

  // Merge dynamic columns with default properties
  useEffect(() => {
    if (tableColumns.length > 0) {
      // Create a map of existing properties by key for quick lookup
      const propertiesMap = new Map<string, ServerProperty>();
      
      // First add all default properties
      defaultProperties.forEach((prop: ServerProperty) => {
        propertiesMap.set(prop.key, { ...prop });
      });
      
      // Then add or update with dynamic columns
      tableColumns.forEach((column: any) => {
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
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
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
    // Enum type validation
    if (column.type === 'enum') {
      if (!column.enumTypeName || !column.enumTypeName.trim()) {
        errors.enumTypeName = 'Enum type name is required';
      }
      if (!column.enumValues || column.enumValues.length < 2 || column.enumValues.some((v: string) => !v.trim())) {
        errors.enumValues = 'At least two non-empty enum values are required';
      }
    }
    return errors;
  };

  // Dedicated handler for enum type column creation
  const handleSubmitEnum = useCallback(async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate call');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Starting enum submission');
    
    try {
      console.log('Creating enum with values:', newColumn.enumValues);
      
      // 1. Create the new enum type
      const { data: enumData, error: enumError } = await supabase.functions.invoke('enum-manager', {
        method: 'POST',
        body: {
          action: 'create',
          type: newColumn.key, // map property key to type
          value: newColumn.enumValues
        }
      });
      
      if (enumError) {
        console.error('Enum creation error:', enumError);
        toast({
          title: "Error Creating Enum Type",
          description: enumError.message,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Enum created successfully:', enumData);
      
      // 2. Create the property using the enum
      const requestBody = {
        name: newColumn.name,
        key: newColumn.key,
        type: newColumn.type,
        enumType: enumData.name,
        description: newColumn.description || `${newColumn.name} property`,
        required: newColumn.required || false,
        options: enumData.values,
        default_value: newColumn.default_value || null
      };
      
      console.log('Creating property with body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('property-manager', {
        method: 'POST',
        body: requestBody
      });
      
      if (error) {
        console.error('Property creation error:', error);
        throw error;
      }
      
      if (data) {
        console.log('Property created successfully:', data);
        const propertyData = data.data || data;
        
        // Create the new column object
        const newProperty: ServerProperty = {
          id: propertyData.id,
          name: propertyData.name,
          key: propertyData.key,
          type: propertyData.property_type as any,
          required: propertyData.required || false,
          visible: true,
          options: propertyData.options || [],
          is_enum: propertyData.property_type === 'enum',
          description: propertyData.description,
          category: propertyData.category || undefined,
          default_value: propertyData.default_value || undefined
        };
        
        console.log('Adding column to properties:', newProperty);
        
        // Update properties state
        setProperties((currentProperties: ServerProperty[]) => {
          console.log('Current properties count:', currentProperties.length);
          const updatedProperties = [...currentProperties, newProperty];
          console.log('Updated properties count:', updatedProperties.length);
          return updatedProperties;
        });
        
        // Reset form state
        const resetState = {
          name: "",
          key: "",
          type: "text" as const,
          required: true,
          visible: true,
          options: [],
          enumType: "",
          enumTypeName: "",
          enumValues: []
        };
        console.log('Resetting form state to:', resetState);
        setNewColumn(resetState);
        
        // Close dialog
        console.log('Closing dialog');
        setIsAddDialogOpen(false);
        
        // Show success message
        toast({
          title: "Property Added",
          description: `Successfully added property '${propertyData.name}'\n\nNote: Please refresh the page to see the new column in the table.`,
          duration: 5000
        });
        
        // Refresh the table schema to ensure new column is available
        try {
          await refreshSchema();
          console.log('Table schema refreshed successfully');
          
          // Refresh enums to ensure the new enum type is available for future operations
          await refreshEnums();
          console.log('Enums refreshed after new column creation');
          
          // Emit a global event for other components to refresh their schemas
          window.dispatchEvent(new CustomEvent('schemaUpdated', { 
            detail: { 
              action: 'enum_column_added', 
              columnKey: newColumn.key,
              columnName: newColumn.name 
            } 
          }));
        } catch (refreshError) {
          console.error('Failed to refresh table schema:', refreshError);
        }
        
        console.log('Enum submission completed successfully');
      } else {
        throw new Error(data?.error || "Failed to add property");
      }
    } catch (err: any) {
      console.error('Error adding enum column:', err);
      let errorMessage = err.message || "Failed to add column";
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
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  }, [isSubmitting, newColumn, toast, refreshSchema]);

  // Updated handleSubmit to delegate to handleSubmitEnum for enum type
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      toast({
        title: "Validation Error",
        description: Object.values(errors)[0],
        variant: "destructive"
      });
      return;
    }
    const propertyKey = newColumn.key.toLowerCase();
    // Check for duplicate keys
    const keyExists = properties.some((p: ServerProperty) => p.key.toLowerCase() === propertyKey);
    if (keyExists) {
      toast({
        title: "Validation Error",
        description: `A property with the key '${propertyKey}' already exists`,
        variant: "destructive"
      });
      return;
    }
    
    // For enum types, delegate to specialized handler
    if (newColumn.type === 'enum') {
      await handleSubmitEnum();
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the request body to match the working API call
      const requestBody = {
        name: newColumn.name,
        key: newColumn.key,
        type: newColumn.type,
        enumType: newColumn.enumType, // Add enumType for enum columns
        description: newColumn.description || `${newColumn.name} property`,
        required: newColumn.required || false,
        options: newColumn.options || [],
        default_value: newColumn.default_value || null
      };
      const { data, error } = await supabase.functions.invoke('property-manager', {
        method: 'POST',
        body: requestBody
      });
      if (error) throw error;
      if (data) {
        const propertyData = data.data || data;
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
        setProperties((prev: ServerProperty[]) => [...prev, column]);
        
        // Reset form state with all required properties
        setNewColumn({
          name: "",
          key: "",
          type: "text",
          required: true,
          visible: true,
          options: [],
          enumType: "",
          enumTypeName: "",
          enumValues: []
        });
        
        setIsAddDialogOpen(false);
        toast({
          title: "Property Added",
          description: `Successfully added property '${data.data.name}'\n\nNote: Please refresh the page to see the new column in the table.`,
          duration: 5000
        });
      } else {
        throw new Error(data?.error || "Failed to add property");
      }
    } catch (err: any) {
      console.error('Error adding column:', err);
      let errorMessage = err.message || "Failed to add column";
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

  // Handler to remove enum value
  const handleRemoveEnumValue = async (propertyKey: string, value: string) => {
    try {
      await supabase.functions.invoke('enum-manager', {
        method: 'POST',
        body: { action: 'remove', type: propertyKey, value }
      });
      setProperties((prev) => prev.map((p) =>
        p.key === propertyKey ? { ...p, options: p.options?.filter((v) => v !== value) } : p
      ));
      
      // Refresh enums to ensure changes are reflected everywhere
      try {
        await refreshEnums();
        await refreshSchema();
        console.log('Schema and enums refreshed after enum value removal');
        
        // Emit events for other components to refresh their schemas and enums
        window.dispatchEvent(new CustomEvent('enumsUpdated', { 
          detail: { 
            action: 'enum_value_removed', 
            columnKey: propertyKey,
            removedValue: value
          } 
        }));
        
        window.dispatchEvent(new CustomEvent('schemaUpdated', { 
          detail: { 
            action: 'enum_value_removed', 
            columnKey: propertyKey,
            removedValue: value
          } 
        }));
      } catch (refreshError) {
        console.error('Failed to refresh after enum value removal:', refreshError);
      }
      
      toast({ title: 'Option Removed', description: `Removed ${value} from ${propertyKey}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Handler to open add enum dialog
  const openAddEnumDialog = (property: ServerProperty) => {
    setSelectedProperty(property);
    setNewEnumValue("");
    setIsAddEnumDialogOpen(true);
  };

  // Enum value management state
  const [isAddEnumDialogOpen, setIsAddEnumDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<ServerProperty | null>(null);
  const [newEnumValue, setNewEnumValue] = useState("");

  // Handler to add enum value using global context
  const handleAddEnumValue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProperty || !newEnumValue.trim()) return;
    try {
      await addEnumValue(selectedProperty.key, newEnumValue);
      await refreshEnums(); // Ensure enums are refreshed after add
      
      // Update local property options after refresh
      setProperties((prev) => prev.map((p) =>
        p.key === selectedProperty.key && p.options
          ? { ...p, options: [...p.options, newEnumValue] }
          : p
      ));
      
      // Refresh the table schema to ensure enum values are updated everywhere
      try {
        await refreshSchema();
        console.log('Table schema refreshed after enum value addition');
        
        // Emit events for other components to refresh their schemas and enums
        window.dispatchEvent(new CustomEvent('enumsUpdated', { 
          detail: { 
            action: 'enum_value_added', 
            columnKey: selectedProperty.key,
            columnName: selectedProperty.name,
            newValue: newEnumValue
          } 
        }));
        
        window.dispatchEvent(new CustomEvent('schemaUpdated', { 
          detail: { 
            action: 'enum_value_added', 
            columnKey: selectedProperty.key,
            columnName: selectedProperty.name,
            newValue: newEnumValue
          } 
        }));
      } catch (refreshError) {
        console.error('Failed to refresh table schema after enum value addition:', refreshError);
      }
      
      toast({ title: 'Option Added', description: `Added ${newEnumValue} to ${selectedProperty.key}` });
      setIsAddEnumDialogOpen(false);
      setNewEnumValue("");
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleTypeChange = (value: string) => {
    setNewColumn((prev: Partial<ServerProperty>) => {
      const updated = {
        ...prev,
        type: value as ServerProperty['type']
      };
      
      // Reset options and enumType when type changes
      if (value === 'select' && !prev.options) {
        updated.options = [];
      } else if (value === 'enum' && !prev.enumType) {
        updated.enumType = '';
        delete updated.options;
      } else if (value !== 'select' && value !== 'enum' && prev.options) {
        delete updated.options;
        delete updated.enumType;
      }
      
      return updated;
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        setProperties(properties.filter((prop: ServerProperty) => prop.key !== propertyToDelete?.key));
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties">Properties</TabsTrigger>
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
                        <SelectItem value="enum">Enum (Database Type)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Enum Type Creation (replaces Enum Type Selection) */}
                  {newColumn.type === 'enum' && (
                    <div className="space-y-2">
                      <Label>Enum Values</Label>
                      <div className="space-y-2">
                        {/* Merge enumTypeName as the first value in enumValues */}
                        <Input
                          value={newColumn.enumTypeName || ""}
                          onChange={e => {
                            setNewColumn(prev => ({
                              ...prev,
                              enumTypeName: e.target.value,
                              enumValues: [e.target.value, ...(prev.enumValues || []).filter((v, i) => i !== 0)]
                            }));
                          }}
                          placeholder="First enum value (e.g., device_status)"
                        />
                        {(newColumn.enumValues || []).slice(1).map((value, idx) => (
                          <div key={idx + 1} className="flex items-center space-x-2">
                            <Input
                              value={value}
                              onChange={e => {
                                const updated = [...(newColumn.enumValues || [])];
                                updated[idx + 1] = e.target.value;
                                setNewColumn(prev => ({ ...prev, enumValues: updated }));
                              }}
                              placeholder="Enum value"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                              setNewColumn(prev => ({
                                ...prev,
                                enumValues: (prev.enumValues || []).filter((_, i) => i !== idx + 1)
                              }));
                            }}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setNewColumn(prev => ({
                            ...prev,
                            enumValues: [...(prev.enumValues || []), '']
                          }));
                        }}>
                          Add Value
                        </Button>
                      </div>
                    </div>
                  )}
                  
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
                    <div className="flex items-center space-x-4 w-full">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{property.name}</h4>
                          {property.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{property.type}</Badge>
                          {property.type === 'enum' && property.enumType && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              {property.enumType}
                            </Badge>
                          )}
                          {property.is_enum && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              ENUM
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">Key: {property.key}</p>
                        {/* Enum value management UI */}
                        {property.is_enum && (
                          <div className="flex flex-wrap gap-2 mt-2 items-center justify-start">
                            {property.options?.map((value) => (
                              <Badge key={value} variant="secondary" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-normal justify-center items-center">
                                {value}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEnumValue(property.key, value)}
                                  className="ml-1 rounded-full bg-gray-200 hover:bg-muted p-1 flex items-center justify-center"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px' }}
                                >
                                  <span className="sr-only">Remove</span>
                                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Add Option button in top right above Required/System */}
                      {property.is_enum && (
                        <div className="flex flex-col items-end justify-start min-w-[100px]">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAddEnumDialog(property)}
                            className="flex items-center justify-center h-7 text-xs px-2 mb-2"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                          <div className="flex items-center space-x-2 mt-2">
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
                              className="text-gray-500 hover:text-gray-700 mt-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

        <TabsContent value="import" className="space-y-6">
          <BulkImport onImportComplete={handleBulkImportComplete} />
        </TabsContent>
      </Tabs>

      {/* Add Enum Value Dialog */}
      <Dialog open={isAddEnumDialogOpen} onOpenChange={setIsAddEnumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Enum Option</DialogTitle>
            <DialogDescription>
              Add a new option to {selectedProperty?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEnumValue} className="space-y-4">
            <Input
              value={newEnumValue}
              onChange={(e) => setNewEnumValue(e.target.value)}
              placeholder="Enter new option"
            />
            <Button type="submit">Add</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerProperties;