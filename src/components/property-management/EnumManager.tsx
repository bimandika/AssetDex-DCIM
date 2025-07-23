import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

// Types
import { ServerProperty } from "@/types/server";

// Hooks
import { useServerEnums } from "@/hooks/useServerEnums";
import { useTableSchema } from "@/hooks/useTableSchema";

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_enum: boolean;
  enum_values?: string[];
}

interface PropertyFormValues {
  property: string;
  newOption: string;
}

interface EnumManagerProps {
  properties: ServerProperty[];
  setProperties: (properties: ServerProperty[]) => void;
}

/**
 * EnumManager component manages enum values for server table columns.
 * It allows viewing, adding, and removing enum values for columns that support them.
 */
const EnumManager = ({ properties, setProperties }: EnumManagerProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    type: true,
    environment: true,
    other: true
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<TableColumn | null>(null);
  
  const { columns, loading: schemaLoading } = useTableSchema("servers");
  const { enums, addEnumValue, removeEnumValue, loading: enumsLoading } = useServerEnums();
  
  const { handleSubmit, reset, setValue, register, formState: { errors } } = useForm<PropertyFormValues>({
    defaultValues: {
      property: "",
      newOption: ""
    }
  });

  // Group properties by category
  const groupedProperties = useMemo(() => {
    const groups: Record<string, TableColumn[]> = {
      status: [],
      type: [],
      location: [],
      hardware: [],
      configuration: [],
      other: []
    };

    columns?.forEach(column => {
      if (!column.is_enum) return;
      
      const colName = column.column_name.toLowerCase();
      
      if (colName.includes('status')) {
        groups.status.push(column);
      } 
      else if (colName.includes('type') || colName === 'device_type') {
        groups.type.push(column);
      }
      else if (colName.includes('environment') || colName.includes('site') || 
               colName.includes('building') || colName.includes('rack') || 
               colName.includes('unit')) {
        groups.location.push(column);
      }
      else if (colName.includes('brand') || colName.includes('model') || 
               colName.includes('operating_system')) {
        groups.hardware.push(column);
      }
      else if (colName.includes('allocation') || colName.includes('configuration')) {
        groups.configuration.push(column);
      }
      else {
        groups.other.push(column);
      }
    });

    // Filter out empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, items]) => items.length > 0)
    );
  }, [columns]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const openAddOptionDialog = useCallback((property: TableColumn) => {
    setSelectedProperty(property);
    setValue('property', property.column_name);
    setValue('newOption', '');
    setIsDialogOpen(true);
  }, [setValue]);

  const handleAddOption = useCallback(async (data: PropertyFormValues) => {
    if (!selectedProperty) return;
    
    try {
      await addEnumValue(selectedProperty.column_name, data.newOption);
      toast.success(`Added new option "${data.newOption}" to ${selectedProperty.column_name}`);
      setIsDialogOpen(false);
      reset();
    } catch (error) {
      console.error('Error adding enum value:', error);
      toast.error(`Failed to add option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedProperty, addEnumValue, reset]);

  const handleRemoveOption = useCallback(async (columnName: string, value: string) => {
    try {
      await removeEnumValue(columnName, value);
      toast.success(`Removed option "${value}" from ${columnName}`);
    } catch (error) {
      console.error('Error removing enum value:', error);
      toast.error(`Failed to remove option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [removeEnumValue]);

  const renderPropertyField = (property: TableColumn) => {
    const currentValues = (enums as Record<string, string[]>)[property.column_name] || [];
    
    return (
      <div key={property.column_name} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-medium">
            {property.column_name}
            <span className="ml-2 text-muted-foreground text-xs">
              ({property.data_type})
            </span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => openAddOptionDialog(property)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Option
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {currentValues.map((value) => (
            <Badge key={value} variant="outline" className="flex items-center gap-1">
              {value}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveOption(property.column_name, value);
                }}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {currentValues.length === 0 && (
            <span className="text-sm text-muted-foreground">No options defined</span>
          )}
        </div>
      </div>
    );
  };

  if (schemaLoading || enumsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Options Manager</h2>
        <p className="text-sm text-muted-foreground">
          Manage Options values for server properties
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {Object.entries(groupedProperties).map(([section, sectionProperties]) => (
            sectionProperties.length > 0 && (
              <div key={section} className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection(section)}
                >
                  <h3 className="font-medium capitalize">{section}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(section);
                    }}
                  >
                    {expandedSections[section] ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
                
                {expandedSections[section] && (
                  <div className="space-y-4 pl-4">
                    {sectionProperties.map(property => renderPropertyField(property))}
                  </div>
                )}
              </div>
            )
          ))}
        </CardContent>
      </Card>

      {/* Add Option Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(handleAddOption)}>
            <DialogHeader>
              <DialogTitle>Add New Option</DialogTitle>
              <DialogDescription>
                Add a new option to {selectedProperty?.column_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newOption">New Option</Label>
                <Input
                  id="newOption"
                  placeholder="Enter option value"
                  {...register('newOption', {
                    required: 'Option value is required',
                    validate: (value) => {
                      if (!selectedProperty) return true;
                      const currentValues = enums[selectedProperty.column_name] || [];
                      return !currentValues.includes(value) || 'This option already exists';
                    }
                  })}
                />
                {errors.newOption && (
                  <p className="text-sm text-destructive">{errors.newOption.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Option</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnumManager;
