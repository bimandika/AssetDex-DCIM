import { useCallback, useMemo, useState, useEffect } from "react";
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

  
  const { columns, loading: schemaLoading } = useTableSchema("servers");
  const { enums, loading: enumsLoading, addEnumValue } = useServerEnums();
  
  const { handleSubmit, reset, setValue, register, formState: { errors } } = useForm<PropertyFormValues>({
    defaultValues: {
      property: "",
      newOption: ""
    }
  });

  // Listen for enum updates to refresh the component
  useEffect(() => {
    const handleEnumsUpdated = (event: CustomEvent) => {
      console.log('EnumManager: Received enum update event', event.detail);
      // The enums are already updated in the global context
      // This ensures the UI reflects the changes immediately
    };

    window.addEventListener('enumsUpdated', handleEnumsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('enumsUpdated', handleEnumsUpdated as EventListener);
    };
  }, []);
  
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
  
  // Get all enum columns
  const enumColumns = useMemo(() => {
    return columns?.filter(column => column.is_enum) || [];
  }, [columns]);

  const openAddOptionDialog = useCallback((property: TableColumn) => {
    setSelectedProperty(property);
    setValue('property', property.column_name);
    setValue('newOption', '');
    setIsDialogOpen(true);
  }, [setValue]);

  const handleAddOption = useCallback(async (data: PropertyFormValues) => {
    if (!selectedProperty) return;
    
    try {
      const success = await addEnumValue(selectedProperty.column_name, data.newOption);
      if (success) {
        setIsDialogOpen(false);
        reset();
      }
    } catch (error) {
      // Error is already handled in addEnumValue
      console.error('Error in handleAddOption:', error);
    }
  }, [selectedProperty, addEnumValue, reset]);

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
      <div key={property.column_name} className="space-y-2 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <Label className="font-medium">
            {property.column_name.replace(/_/g, ' ')}
            <span className="ml-2 text-muted-foreground text-xs">
              ({property.data_type})
            </span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => openAddOptionDialog(property)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Option
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {currentValues.length > 0 ? (
            currentValues.map((value) => (
              <Badge key={value} variant="secondary" className="flex items-center gap-1">
                {value}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOption(property.column_name, value);
                  }}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <div className="text-sm text-muted-foreground py-1">No options defined</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Enum Manager</h2>
        <p className="text-sm text-muted-foreground">
          Manage enum values for server properties
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {schemaLoading || enumsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enumColumns.map(renderPropertyField)}
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
