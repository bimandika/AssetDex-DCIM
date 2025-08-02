# ServerProperties Color Integration Plan

## Overview

This plan outlines the integration of enum color selection capabilities into the ServerProperties component, allowing users to choose and edit colors for enum values (allocation and model types) directly within the property management interface.

## Current State Analysis

### Existing Components
- ✅ **EnumColorManager**: Comprehensive color management component with full CRUD operations
- ✅ **ColorPicker**: UI component for color selection with preset palette and custom hex input
- ✅ **useEnumColors**: Hook for color management with API integration
- ✅ **Backend API**: enum-colors endpoint with full functionality
- ✅ **Database**: enum_colors table with proper schema and RLS policies

### ServerProperties Current Functionality
- ✅ Enum property creation with dynamic value management
- ✅ Add enum values to existing properties
- ✅ Property type validation and form handling
- ❌ **Missing**: Color selection during enum creation
- ❌ **Missing**: Color management for existing enum properties

## Implementation Plan

### Phase 1: Interface Enhancement

#### 1.1 Update ServerProperty Interface
**File**: `src/components/ServerProperties.tsx`

```typescript
// Add to existing ServerProperty interface
export interface ServerProperty {
  // ... existing properties
  enumColors?: Record<string, string>; // NEW: Color mapping for enum values
  hasColorSupport?: boolean; // NEW: Indicates if this enum supports coloring
}
```

#### 1.2 Add Color Management States
```typescript
// Add to component state
const [isColorManagementOpen, setIsColorManagementOpen] = useState(false);
const [selectedPropertyForColors, setSelectedPropertyForColors] = useState<ServerProperty | null>(null);
const [enumColorMap, setEnumColorMap] = useState<Record<string, string>>({});
```

### Phase 2: Enum Creation Enhancement

#### 2.1 Add Color Selection to Enum Creation Form
**Location**: Inside the enum creation dialog, after enum values input

```tsx
{/* Add after enum values section */}
{newColumn.type === 'enum' && newColumn.enumValues && newColumn.enumValues.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">Enum Value Colors</Label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          // Auto-generate colors for all enum values
          const colors: Record<string, string> = {};
          const defaultPalette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
          newColumn.enumValues?.forEach((value, index) => {
            if (value.trim()) {
              colors[value] = defaultPalette[index % defaultPalette.length];
            }
          });
          setNewColumn(prev => ({ ...prev, enumColors: colors }));
        }}
      >
        Generate Colors
      </Button>
    </div>
    
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {newColumn.enumValues.map((value, idx) => {
        if (!value.trim()) return null;
        
        return (
          <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <span className="text-sm font-medium">{value}</span>
            </div>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={newColumn.enumColors?.[value] || '#3B82F6'}
                onChange={(color) => {
                  setNewColumn(prev => ({
                    ...prev,
                    enumColors: {
                      ...prev.enumColors,
                      [value]: color
                    }
                  }));
                }}
              />
              <Input
                type="text"
                value={newColumn.enumColors?.[value] || ''}
                onChange={(e) => {
                  const color = e.target.value;
                  if (/^#[0-9A-F]{6}$/i.test(color)) {
                    setNewColumn(prev => ({
                      ...prev,
                      enumColors: {
                        ...prev.enumColors,
                        [value]: color
                      }
                    }));
                  }
                }}
                placeholder="#3B82F6"
                className="w-24 text-xs font-mono"
              />
            </div>
          </div>
        );
      })}
    </div>
    
    <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
      💡 <strong>Tip:</strong> Colors will be used to visually distinguish enum values in rack views. 
      You can change these colors later in the property management section.
    </div>
  </div>
)}
```

#### 2.2 Update Enum Creation Handler
**Enhancement to `handleSubmitEnum` function:**

```typescript
const handleSubmitEnum = useCallback(async () => {
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  
  try {
    // 1. Create the enum type and values (existing code)
    const { data: enumData, error: enumError } = await supabase.functions.invoke('enum-manager', {
      method: 'POST',
      body: {
        action: 'create',
        type: newColumn.key,
        value: newColumn.enumValues
      }
    });
    
    if (enumError) throw enumError;
    
    // 2. Create the property (existing code)
    const { data, error } = await supabase.functions.invoke('property-manager', {
      method: 'POST',
      body: {
        name: newColumn.name,
        key: newColumn.key,
        type: newColumn.type,
        enumType: enumData.name,
        description: newColumn.description || `${newColumn.name} property`,
        required: newColumn.required || false,
        options: enumData.values,
        default_value: newColumn.default_value || null
      }
    });
    
    if (error) throw error;
    
    // 3. NEW: Save enum colors if provided
    if (newColumn.enumColors && Object.keys(newColumn.enumColors).length > 0) {
      const enumTypeName = newColumn.key === 'allocation' ? 'allocation_type' : 
                          newColumn.key === 'model' ? 'model_type' : 
                          newColumn.key;
      
      for (const [enumValue, colorHex] of Object.entries(newColumn.enumColors)) {
        if (enumValue.trim() && colorHex) {
          await supabase.functions.invoke('enum-colors', {
            method: 'POST',
            body: {
              enum_type: enumTypeName,
              enum_value: enumValue,
              color_hex: colorHex,
              color_name: `${enumValue} Color`
            }
          });
        }
      }
    }
    
    // ... rest of existing success handling
    
  } catch (err) {
    // ... existing error handling
  } finally {
    setIsSubmitting(false);
  }
}, [isSubmitting, newColumn, toast, refreshSchema]);
```

### Phase 3: Existing Enum Color Management

#### 3.1 Add Color Management Button to Enum Properties
**Enhancement to existing enum property display:**

```tsx
{/* Add to existing enum property display section */}
{property.is_enum && (
  <div className="flex flex-wrap gap-2 mt-2 items-center justify-between">
    <div className="flex flex-wrap gap-2">
      {property.options?.map((value) => (
        <Badge 
          key={value} 
          variant="secondary" 
          className="px-2 py-1 rounded-full text-xs font-normal"
          style={{
            backgroundColor: enumColorMap[`${property.key}_${value}`] || '#e2e8f0',
            color: getContrastTextColor(enumColorMap[`${property.key}_${value}`] || '#e2e8f0')
          }}
        >
          {value}
        </Badge>
      ))}
    </div>
    
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => openAddEnumDialog(property)}
        className="flex items-center justify-center h-7 text-xs px-2"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Option
      </Button>
      
      {/* NEW: Color Management Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedPropertyForColors(property);
          setIsColorManagementOpen(true);
        }}
        className="flex items-center justify-center h-7 text-xs px-2"
      >
        <Palette className="h-3 w-3 mr-1" />
        Colors
      </Button>
    </div>
  </div>
)}
```

#### 3.2 Add Color Management Dialog
**New dialog component within ServerProperties:**

```tsx
{/* Color Management Dialog */}
<Dialog open={isColorManagementOpen} onOpenChange={setIsColorManagementOpen}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Manage Colors - {selectedPropertyForColors?.name}</DialogTitle>
      <DialogDescription>
        Customize colors for {selectedPropertyForColors?.name} enum values. 
        These colors will be used in rack visualizations.
      </DialogDescription>
    </DialogHeader>
    
    {selectedPropertyForColors && (
      <EnumColorManager
        enumType={
          selectedPropertyForColors.key === 'allocation' ? 'allocation_type' :
          selectedPropertyForColors.key === 'model' ? 'model_type' :
          undefined
        }
        onColorChange={(enumValue, color) => {
          // Update local color map for immediate preview
          setEnumColorMap(prev => ({
            ...prev,
            [`${selectedPropertyForColors.key}_${enumValue}`]: color
          }));
        }}
      />
    )}
    
    <div className="flex justify-end space-x-2 mt-4">
      <Button 
        variant="outline" 
        onClick={() => {
          setIsColorManagementOpen(false);
          setSelectedPropertyForColors(null);
        }}
      >
        Close
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Phase 4: Color Preview Integration

#### 4.1 Add Color Loading Hook
```typescript
// Add to component
const { getColor, loading: colorsLoading } = useEnumColors();

// Load colors for preview
useEffect(() => {
  const loadEnumColors = async () => {
    const colorMap: Record<string, string> = {};
    
    for (const property of properties) {
      if (property.is_enum && property.options) {
        const enumTypeName = property.key === 'allocation' ? 'allocation_type' :
                            property.key === 'model' ? 'model_type' :
                            property.key;
        
        for (const option of property.options) {
          const color = getColor(option);
          if (color) {
            colorMap[`${property.key}_${option}`] = color;
          }
        }
      }
    }
    
    setEnumColorMap(colorMap);
  };
  
  if (!colorsLoading) {
    loadEnumColors();
  }
}, [properties, getColor, colorsLoading]);
```

#### 4.2 Add Contrast Text Color Helper
```typescript
// Add utility function
const getContrastTextColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};
```

### Phase 5: Import Dependencies

#### 5.1 Add Required Imports
```typescript
// Add to existing imports in ServerProperties.tsx
import { EnumColorManager } from "@/components/EnumColorManager";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useEnumColors } from "@/hooks/useEnumColors";
import { Palette } from "lucide-react"; // Add to existing lucide-react imports
```

### Phase 6: Enhanced User Experience

#### 6.1 Add Enum Type Detection
```typescript
// Helper function to determine enum type mapping
const getEnumTypeForProperty = (propertyKey: string): 'allocation_type' | 'model_type' | undefined => {
  // Map specific property keys to enum types
  const keyMapping: Record<string, 'allocation_type' | 'model_type'> = {
    'allocation': 'allocation_type',
    'model': 'model_type',
    'device_type': 'model_type', // if device types use model coloring
    // Add more mappings as needed
  };
  
  return keyMapping[propertyKey.toLowerCase()];
};
```

#### 6.2 Add Quick Color Generation
```typescript
// Quick color generation for existing enums without colors
const generateQuickColors = async (property: ServerProperty) => {
  if (!property.options || !property.is_enum) return;
  
  const enumType = getEnumTypeForProperty(property.key);
  if (!enumType) return;
  
  const defaultPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
  ];
  
  for (let i = 0; i < property.options.length; i++) {
    const color = defaultPalette[i % defaultPalette.length];
    await supabase.functions.invoke('enum-colors', {
      method: 'POST',
      body: {
        enum_type: enumType,
        enum_value: property.options[i],
        color_hex: color,
        color_name: `${property.options[i]} Color`
      }
    });
  }
  
  toast({
    title: "Colors Generated",
    description: `Generated colors for ${property.name} enum values`
  });
};
```

## Implementation Priority

### High Priority (Week 1)
1. ✅ Add enum color selection to creation form
2. ✅ Update enum creation handler to save colors
3. ✅ Add color management button to existing enums

### Medium Priority (Week 2)
1. ✅ Implement color management dialog
2. ✅ Add color preview in property list
3. ✅ Add contrast text color calculation

### Low Priority (Week 3)
1. ✅ Add quick color generation for existing enums
2. ✅ Enhanced enum type detection
3. ✅ Performance optimization and caching

## Testing Plan

### Manual Testing
1. **Create New Enum with Colors**:
   - Create new enum property
   - Set enum values
   - Assign colors to each value
   - Verify colors are saved
   - Check colors appear in RoomView

2. **Edit Existing Enum Colors**:
   - Open existing enum property
   - Click "Colors" button
   - Modify colors in EnumColorManager
   - Verify changes persist
   - Check updated colors in visualizations

3. **Color Contrast Testing**:
   - Test light and dark color combinations
   - Verify text remains readable
   - Test accessibility with screen readers

### Integration Testing
1. **API Integration**:
   - Test enum-colors endpoint
   - Verify database persistence
   - Test error handling

2. **Component Integration**:
   - Test EnumColorManager integration
   - Test ColorPicker functionality
   - Test useEnumColors hook

## Benefits

### For Users
- **Visual Customization**: Personalize enum colors to match organizational standards
- **Improved Recognition**: Faster identification of server types and allocations
- **Workflow Integration**: Color management integrated into existing property workflow
- **Immediate Feedback**: Real-time color preview and instant visualization updates

### For System
- **Consistency**: Unified color management across all enum types
- **Extensibility**: Easy to add color support to new enum properties
- **Performance**: Efficient color loading and caching
- **Maintainability**: Clean separation of color logic from visualization logic

## Success Metrics

1. **Functionality**: All enum properties can have colors assigned
2. **User Experience**: Color selection is intuitive and responsive
3. **Visual Impact**: Colors enhance rack view clarity and usability
4. **Performance**: No significant impact on page load or interaction times
5. **Accessibility**: Colors maintain proper contrast ratios

## Future Enhancements

1. **Color Themes**: Predefined color schemes (corporate, seasonal, etc.)
2. **Bulk Color Operations**: Apply colors to multiple enums simultaneously
3. **Color Analytics**: Usage statistics and color effectiveness metrics
4. **Advanced Color Tools**: Gradient support, pattern overlays
5. **Import/Export**: Share color configurations between instances
