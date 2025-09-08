import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEnumColors, EnumColor } from '@/hooks/useEnumColors';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';

interface EnumColorManagerProps {
  enumType?: 'allocation_type' | 'model_type';
  availableValues?: string[];
  onColorChange?: (enumValue: string, color: string) => void;
}

// Known enum values for dropdown
const ENUM_VALUES = {
  allocation_type: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database'],
  model_type: [
    'PowerEdge R740', 'PowerEdge R750', 'PowerEdge R640', 'PowerEdge R650',
    'ProLiant DL380', 'ProLiant DL360', 'ProLiant DL385', 'ProLiant DL365',
    'ThinkSystem SR650', 'ThinkSystem SR630', 'ThinkSystem SR850',
    'UCS C220', 'UCS C240', 'UCS C480'
  ]
};

export function EnumColorManager({ enumType, availableValues, onColorChange }: EnumColorManagerProps) {
  const [colorScheme, setColorScheme] = useState('custom');
  const [theme, setTheme] = useState('dark');
  const [editingColors, setEditingColors] = useState({});
  useUrlState('enumColor_scheme', colorScheme, setColorScheme);
  useUrlState('enumColor_theme', theme, setTheme);
  useAutoSave(editingColors, 'enumColorManager_editing');
  useRestoreForm('enumColorManager_editing', setEditingColors);

  const {
    colors,
    loading,
    error,
    saveColor,
    updateColor,
    deleteColor,
    getColorsForType,
    generateDefaultColors,
    fetchColors
  } = useEnumColors(enumType);

  const { toast } = useToast();
  const [newColor, setNewColor] = useState({
    enum_type: enumType || 'allocation_type' as const,
    enum_value: '',
    color_hex: '#3B82F6',
    color_name: ''
  });

  // Filter colors by type if specified
  const filteredColors = enumType ? getColorsForType(enumType) : colors;

  const handleSaveColor = async () => {
    if (!newColor.enum_value.trim()) {
      toast({
        title: "Error",
        description: "Please select an enum value",
        variant: "destructive"
      });
      return;
    }

    const success = await saveColor(
      newColor.enum_type,
      newColor.enum_value,
      newColor.color_hex,
      newColor.color_name || undefined
    );

    if (success) {
      toast({
        title: "Success",
        description: "Color saved successfully"
      });
      setNewColor({
        ...newColor,
        enum_value: '',
        color_name: ''
      });
      onColorChange?.(newColor.enum_value, newColor.color_hex);
    } else {
      toast({
        title: "Error",
        description: error || "Failed to save color",
        variant: "destructive"
      });
    }
  };

  const handleDeleteColor = async (id: string, enumValue: string) => {
    const success = await deleteColor(id);
    
    if (success) {
      toast({
        title: "Success",
        description: "Color deleted successfully"
      });
      onColorChange?.(enumValue, '');
    } else {
      toast({
        title: "Error",
        description: error || "Failed to delete color",
        variant: "destructive"
      });
    }
  };

  const handleColorUpdate = async (color: EnumColor, newHex: string) => {
    const success = await updateColor(
      color.id,
      newHex,
      color.color_name
    );

    if (success) {
      toast({
        title: "Success",
        description: "Color updated successfully"
      });
      onColorChange?.(color.enum_value, newHex);
    } else {
      toast({
        title: "Error",
        description: error || "Failed to update color",
        variant: "destructive"
      });
    }
  };

  const handleGenerateDefaults = async () => {
    const typeToGenerate = newColor.enum_type;
    const enumValues = availableValues || ENUM_VALUES[typeToGenerate] || [];
    
    await generateDefaultColors(typeToGenerate, enumValues);
    
    toast({
      title: "Success",
      description: `Generated default colors for ${typeToGenerate}`
    });
  };

  const availableEnumValues = (availableValues || ENUM_VALUES[newColor.enum_type] || []).filter(
    value => !filteredColors.some(color => color.enum_value === value)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Enum Color Management
          {enumType && <Badge variant="outline">{enumType}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Color */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-medium">Add New Color</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!enumType && (
              <div>
                <Label htmlFor="enum-type">Enum Type</Label>
                <Select
                  value={newColor.enum_type}
                  onValueChange={(value: 'allocation_type' | 'model_type') => 
                    setNewColor({ ...newColor, enum_type: value, enum_value: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select enum type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allocation_type">Allocation Type</SelectItem>
                    <SelectItem value="model_type">Model Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="enum-value">Enum Value</Label>
              <Select
                value={newColor.enum_value}
                onValueChange={(value) => setNewColor({ ...newColor, enum_value: value })}
                disabled={availableEnumValues.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    availableEnumValues.length === 0 
                      ? "All enum values have colors assigned" 
                      : "Select enum value"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableEnumValues.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      All enum values already have colors assigned
                    </div>
                  ) : (
                    availableEnumValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="color-name">Color Name (Optional)</Label>
              <Input
                id="color-name"
                value={newColor.color_name}
                onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value })}
                placeholder="e.g., Primary Blue"
              />
            </div>
            
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <ColorPicker
                  value={newColor.color_hex}
                  onChange={(color) => setNewColor({ ...newColor, color_hex: color })}
                />
                <span className="text-sm font-mono">{newColor.color_hex}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveColor} 
              disabled={loading || availableEnumValues.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Color
            </Button>
            <Button variant="outline" onClick={handleGenerateDefaults} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Defaults
            </Button>
          </div>
          
          {availableEnumValues.length === 0 && (
            <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">All enum values have colors assigned</span>
              </div>
              <p className="mt-1 text-xs">
                You can edit existing colors below or delete a color to make room for a new assignment.
              </p>
            </div>
          )}
        </div>

        {/* Existing Colors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Current Colors</h3>
            <Button variant="outline" size="sm" onClick={fetchColors} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {loading && <p className="text-center py-4">Loading colors...</p>}
          
          {error && (
            <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}
          
          <div className="grid gap-3">
            {filteredColors.map((color) => (
              <div key={color.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ColorPicker
                    value={color.color_hex}
                    onChange={(newHex) => handleColorUpdate(color, newHex)}
                  />
                  <div>
                    <div className="font-medium">{color.enum_value}</div>
                    <div className="text-sm text-gray-500">
                      {color.enum_type} • {color.color_hex}
                      {color.color_name && ` • ${color.color_name}`}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteColor(color.id, color.enum_value)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            {filteredColors.length === 0 && !loading && (
              <p className="text-center py-8 text-gray-500">
                No colors configured. Add some colors or generate defaults.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
