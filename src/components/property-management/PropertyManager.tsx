
import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import type { FieldValues, Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp, List, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useEnums } from "@/hooks/useEnums";
import { useTableSchema, type TableColumn } from "@/hooks/useTableSchema";

interface ServerProperty {
  id?: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  required: boolean;
  visible: boolean;
  options?: string[];
  category?: string;
  default_value?: string;
  description?: string;
}

interface PropertyManagerProps {
  properties: ServerProperty[];
  setProperties: (properties: ServerProperty[]) => void;
}

interface PropertyFormValues {
  property: string;
  newOption: string;
}

const PropertyManager = ({ properties, setProperties }: PropertyManagerProps) => {
  const { enums, loading: enumsLoading } = useEnums();
  const { columns: tableColumns, loading: schemaLoading } = useTableSchema('servers');
  const [editingProperty, setEditingProperty] = useState<ServerProperty | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Combine properties from props with columns from table schema
  const allProperties = useMemo(() => {
    // Create a map of existing properties by key for quick lookup
    const propertiesMap = new Map(properties.map(p => [p.key, p]));
    
    // Merge table columns with existing properties
    return tableColumns.map(column => {
      const existingProp = propertiesMap.get(column.column_name);
      
      return {
        id: existingProp?.id,
        name: existingProp?.name || column.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        key: column.column_name,
        type: column.is_enum ? 'select' : 'text', // Default to text for non-enum columns
        required: column.is_nullable === 'NO' && !column.column_default,
        visible: existingProp?.visible ?? true,
        options: existingProp?.options || (column.is_enum ? column.enum_values : []),
        category: existingProp?.category || getColumnCategory(column.column_name),
        default_value: existingProp?.default_value || column.column_default,
        description: existingProp?.description
      } as ServerProperty;
    });
  }, [tableColumns, properties]);

  // Helper function to categorize columns
  const getColumnCategory = (columnName: string): string => {
    const column = columnName.toLowerCase();
    
    if (['brand', 'model', 'serial_number', 'os_type', 'os_version'].includes(column)) {
      return 'Server';
    } else if (['site', 'building', 'floor', 'room', 'rack', 'unit'].some(term => column.includes(term))) {
      return 'Location';
    } else if (['status', 'environment', 'allocation'].includes(column)) {
      return 'Status';
    } else if (['ip_address', 'ip_oob', 'mac_address', 'hostname'].includes(column)) {
      return 'Network';
    } else if (['purchase_date', 'warranty_expiry', 'deployment_date'].some(term => column.includes(term))) {
      return 'Lifecycle';
    }
    
    return 'Other';
  };
  
  const { control, handleSubmit, reset, watch, setValue } = useForm<PropertyFormValues>({
    defaultValues: {
      property: '',
      newOption: ''
    }
  });
  
  const selectedProperty = watch('property');
  const currentProperty = properties.find(p => p.key === selectedProperty) || null;

  // Group properties by category
  const groupedProperties = useMemo(() => {
    const groups: Record<string, ServerProperty[]> = {};
    
    allProperties.forEach(prop => {
      // Only show columns that are enums or have options
      if (prop.type === 'select' || prop.options?.length) {
        const category = prop.category || 'Other';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(prop);
      }
    });
    
    // Sort categories
    const sortedGroups: Record<string, ServerProperty[]> = {};
    const categoryOrder = ['Server', 'Location', 'Status', 'Network', 'Lifecycle', 'Other'];
    
    // Add ordered categories first
    categoryOrder.forEach(category => {
      if (groups[category]) {
        sortedGroups[category] = groups[category];
        delete groups[category];
      }
    });
    
    // Add remaining categories
    return { ...sortedGroups, ...groups };
  }, [allProperties]);
  
  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleAddOption = (data: PropertyFormValues) => {
    const { newOption } = data;
    if (!selectedProperty || !newOption.trim()) return;
    
    const propertyKey = selectedProperty;
    const optionValue = newOption.trim();
    const property = properties.find(p => p.key === propertyKey);
    
    if (!property) return;
    
    const currentOptions = property.options || [];
    if (currentOptions.includes(optionValue)) {
      toast({
        title: "Error",
        description: `"${optionValue}" already exists in ${property.name}`,
        variant: "destructive"
      });
      return;
    }
    
    const updatedProperties = properties.map(prop => 
      prop.key === propertyKey
        ? { ...prop, options: [...currentOptions, optionValue].sort() }
        : prop
    );

    setProperties(updatedProperties);
    reset({ newOption: '' });
    toast({
      title: "Success",
      description: `"${optionValue}" added to ${property.name}`
    });
  };

  const removeOption = (propertyKey: string, optionToRemove: string) => {
    const property = properties.find(p => p.key === propertyKey);
    if (!property) return;
    
    // Check if this is a default enum value that shouldn't be removed
    const isDefaultEnumValue = Object.values(enums).some(
      enumArray => Array.isArray(enumArray) && enumArray.includes(optionToRemove)
    );
    
    if (isDefaultEnumValue) {
      toast({
        title: "Cannot Remove",
        description: `"${optionToRemove}" is a default value and cannot be removed`,
        variant: "destructive"
      });
      return;
    }
    
    const updatedProperties = properties.map(prop => 
      prop.key === propertyKey
        ? { 
            ...prop, 
            options: (prop.options || []).filter(opt => opt !== optionToRemove) 
          }
        : prop
    );

    setProperties(updatedProperties);
    toast({
      title: "Option Removed",
      description: `"${optionToRemove}" removed from ${property.name}`
    });
  };
  
  const openAddOptionDialog = (property: ServerProperty) => {
    setValue('property', property.key);
    reset({ newOption: '' });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Manage Property Options</h3>
        <p className="text-slate-600 mb-6">Manage options for all select-type properties</p>
      </div>

      {Object.entries(groupedProperties).map(([category, props]) => {
        const isExpanded = expandedSections[category] ?? true;
        
        return (
          <Card key={category} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(category)}
              className="w-full text-left hover:bg-slate-50 transition-colors"
            >
              {enumsLoading || schemaLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading properties...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4">
                  <h4 className="font-medium">{category}</h4>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </div>
              )}
            </button>
            
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {props.map((property) => (
                    <div key={property.key} className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{property.name}</h4>
                          <div className="text-xs border rounded-full px-2 py-0.5">
                            {property.required ? 'Required' : 'Optional'}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openAddOptionDialog(property)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      
                      {property.options?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {property.options.map((option) => (
                            <div key={option} className="flex items-center space-x-1">
                              <div 
                                className={cn(
                                  "font-normal text-xs border rounded-full px-2 py-0.5 flex items-center",
                                  {
                                    'border-green-200 bg-green-50 text-green-700': 
                                      Object.values(enums).some((arr: unknown) => 
                                        Array.isArray(arr) && arr.includes(option)
                                      )
                                  }
                                )}
                                title={
                                  Object.values(enums).some((arr: unknown) => 
                                    Array.isArray(arr) && arr.includes(option)
                                  ) 
                                    ? 'Default values cannot be removed' 
                                    : ''
                                }
                              >
                                {option}
                                <button 
                                  type="button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeOption(property.key, option);
                                  }}
                                  className="ml-1.5 text-slate-400 hover:text-slate-600"
                                  disabled={Object.values(enums).some((arr: unknown) => 
                                    Array.isArray(arr) && arr.includes(option)
                                  )}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No options defined</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add Option Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(handleAddOption)}>
            <DialogHeader>
              <DialogTitle>
                {currentProperty ? `Add Option to ${currentProperty.name}` : 'Add Option'}
              </DialogTitle>
              <DialogDescription>
                {currentProperty && `Add a new option to the ${currentProperty.name.toLowerCase()} dropdown`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Property</Label>
                <Controller
                  name="property"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!editingProperty}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties
                          .filter(prop => prop.type === 'select')
                          .map((prop) => (
                            <SelectItem key={prop.key} value={prop.key}>
                              {prop.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              {selectedProperty && (
                <div className="space-y-2">
                  <Label htmlFor="newOption">Option Value</Label>
                  <Controller
                    name="newOption"
                    control={control}
                    rules={{ required: 'Option value is required' }}
                    render={({ field, fieldState: { error } }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          id="newOption"
                          placeholder={`Enter ${currentProperty?.name.toLowerCase() || 'property'} option`}
                        />
                        {error && (
                          <p className="text-sm text-red-500">{error.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!selectedProperty || !watch('newOption')?.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyManager;
