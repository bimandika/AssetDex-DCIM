import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTableSchema } from "@/hooks/useTableSchema";
import { useServerEnums } from "@/hooks/useServerEnums";

interface TableColumn {
  column_name: string;
  data_type: string;
  is_enum: boolean;
  enum_values?: string[];
  is_nullable: string;
  column_default: string | null;
}

interface PropertyFormValues {
  property: string;
  newOption: string;
}

interface EnumManagerProps {
  properties: any[];
  setProperties: (properties: any[]) => void;
}

/**
 * EnumManager component manages enum values for server table columns.
 * It allows viewing, adding, and removing enum values for columns that support them.
 */
const EnumManager = ({ properties, setProperties }: EnumManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<TableColumn | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    type: true,
    environment: true,
    other: true
  });
  
  const { columns, loading: schemaLoading } = useTableSchema("servers");
  const { enums, loading: enumsLoading } = useServerEnums();
  
  const { handleSubmit, reset, setValue, register, formState: { errors } } = useForm<PropertyFormValues>({
    defaultValues: {
      property: "",
      newOption: ""
    }
  });
  
  // Map column names to their corresponding enum values
  const columnToEnumMap: Record<string, string> = {
    status: 'status',
    device_type: 'deviceTypes',
    allocation: 'allocationTypes',
    environment: 'environmentTypes',
    brand: 'brands',
    model: 'models',
    operating_system: 'osTypes',
    dc_site: 'sites',
    dc_building: 'buildings',
    rack: 'racks',
    unit: 'units'
  };
  
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
      // Get the enum key from the column name
      const enumKey = columnToEnumMap[selectedProperty.column_name] || 
                     Object.keys(columnToEnumMap).find(key => 
                       selectedProperty.column_name.toLowerCase().includes(key)
                     );
      
      if (!enumKey) {
        throw new Error(`No enum mapping found for column: ${selectedProperty.column_name}`);
      }
      
      // In a real implementation, you would call your API here
      // For now, we'll just show a success message
      // await api.addEnumValue(enumKey, data.newOption);
      
      toast.success(`Added new option "${data.newOption}" to ${selectedProperty.column_name}`);
      setIsDialogOpen(false);
      reset();
    } catch (error) {
      console.error('Error adding enum value:', error);
      toast.error(`Failed to add option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedProperty, reset]);

  const handleRemoveOption = useCallback(async (columnName: string, value: string) => {
    try {
      // Get the enum key from the column name
      const enumKey = columnToEnumMap[columnName] || 
                     Object.keys(columnToEnumMap).find(key => 
                       columnName.toLowerCase().includes(key)
                     );
      
      if (!enumKey) {
        throw new Error(`No enum mapping found for column: ${columnName}`);
      }
      
      // In a real implementation, you would call your API here
      // For now, we'll just show a success message
      // await api.removeEnumValue(enumKey, value);
      
      toast.success(`Removed option "${value}" from ${columnName}`);
    } catch (error) {
      console.error('Error removing enum value:', error);
      toast.error(`Failed to remove option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const renderPropertyField = (property: TableColumn) => {
    // Get the enum key from the columnToEnumMap
    const enumKey = columnToEnumMap[property.column_name] || 
                   Object.keys(columnToEnumMap).find(key => 
                     property.column_name.toLowerCase().includes(key)
                   );
    
    // Get the enum values using the mapped key
    const currentValues = enumKey ? (enums[enumKey as keyof typeof enums] || []) : [];
    
    return (
      <div key={property.column_name} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-medium">
            {property.column_name.replace(/_/g, ' ')}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Enum Manager</h2>
        <p className="text-sm text-muted-foreground">
          Manage enum values for server properties
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {schemaLoading || enumsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedProperties).map(([section, properties]) => (
                <div key={section} className="space-y-4">
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => toggleSection(section)}
                  >
                    <h3 className="text-lg font-medium">
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </h3>
                    <svg 
                      className={`h-5 w-5 ml-2 transition-transform ${expandedSections[section] ? 'rotate-0' : '-rotate-90'}`}
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                  
                  {expandedSections[section] && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {(properties as TableColumn[]).map(renderPropertyField)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Option</DialogTitle>
            <DialogDescription>
              Add a new option to {selectedProperty?.column_name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleAddOption)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newOption">Option Value</Label>
              <Input
                id="newOption"
                placeholder="Enter option value"
                {...register('newOption', { required: 'Option value is required' })}
              />
              {errors.newOption && (
                <p className="text-sm font-medium text-destructive">
                  {errors.newOption.message}
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
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
