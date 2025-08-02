# AssetDex-DCIM: Enum Coloring Implementation Plan

**Created**: August 2, 2025  
**Objective**: Add color-coding to enum allocation and model types for enhanced visualization in RoomView

---

## 📋 Executive Summary

This plan outlines the implementation of user-customizable color-coded visualization for enum values in the AssetDex-DCIM system. Users can now define custom colors for their enum properties directly in the ServerProperties interface, providing enhanced visual identification and personalization capabilities.

### Key User Features:
- **User-Defined Colors**: Complete color control in ServerProperties.tsx
- **Interactive Color Picker**: Visual color selection with live preview
- **Smart Color Generation**: Auto-generate color palettes with one click
- **Real-time Visualization**: Colors immediately reflect in RoomView
- **Accessibility Support**: WCAG 2.1 compliant contrast checking

The system will dynamically assign colors to:
- **Physical Mode**: Colors based on server **model** types (user-customizable)
- **Logical Mode**: Colors based on **allocation** types (user-customizable)

The implementation maintains backwards compatibility while adding powerful customization capabilities that enhance the user experience and visual clarity of datacenter management.

## 🐛 Pre-Implementation Fix: Logical View Issues

**Priority**: HIGH - Must fix before implementing color system

### Current Problems with Logical View:

1. **Missing Logical Data**: Sample data lacks logical information (hostname, allocation, ip_address)
2. **Data Transformation**: Edge function field mapping needs verification
3. **Visual Feedback**: No indication that view mode is working
4. **Debugging**: Need to see what data is actually available

### **Immediate Fixes Required:**

#### Fix 1: Update Sample Data in Migration
**File**: `database/consolidated-migration.sql`

```sql
-- Add logical data to existing sample servers
UPDATE public.servers 
SET 
  hostname = CASE 
    WHEN serial_number = 'DL380-2023-001' THEN 'web-server-01.company.local'
    WHEN serial_number = 'DL380-2023-002' THEN 'db-server-01.company.local'
    WHEN serial_number = 'R750-2024-001' THEN 'app-server-01.company.local'
    WHEN serial_number = 'R750-2024-002' THEN 'cache-server-01.company.local'
    WHEN serial_number = 'R740-2023-001' THEN 'storage-server-01.company.local'
    WHEN serial_number = 'ASA-2023-001' THEN 'firewall-01.company.local'
    WHEN serial_number = 'MX204-2023-001' THEN 'router-01.company.local'
    WHEN serial_number = 'AFF400-2023-001' THEN 'nas-server-01.company.local'
    ELSE CONCAT('server-', SUBSTRING(serial_number, -3), '.company.local')
  END,
  ip_address = CASE 
    WHEN serial_number = 'DL380-2023-001' THEN '192.168.1.10'
    WHEN serial_number = 'DL380-2023-002' THEN '192.168.1.11'
    WHEN serial_number = 'R750-2024-001' THEN '192.168.1.20'
    WHEN serial_number = 'R750-2024-002' THEN '192.168.1.21'
    WHEN serial_number = 'R740-2023-001' THEN '192.168.1.30'
    WHEN serial_number = 'ASA-2023-001' THEN '192.168.1.1'
    WHEN serial_number = 'MX204-2023-001' THEN '192.168.1.2'
    WHEN serial_number = 'AFF400-2023-001' THEN '192.168.1.50'
    ELSE CONCAT('192.168.1.', 100 + ROW_NUMBER() OVER (ORDER BY id))
  END,
  allocation = CASE 
    WHEN device_type = 'Server' AND brand = 'HPE' THEN 'PAAS'
    WHEN device_type = 'Server' AND brand = 'Dell' AND model LIKE '%R750%' THEN 'SAAS'
    WHEN device_type = 'Server' AND brand = 'Dell' AND model LIKE '%R740%' THEN 'IAAS'
    WHEN device_type = 'Network' THEN 'Load Balancer'
    WHEN device_type = 'Storage' THEN 'Database'
    ELSE 'IAAS'
  END
WHERE hostname IS NULL OR hostname = '' OR ip_address IS NULL OR allocation IS NULL;
```

#### Fix 2: Add Debug Information to RoomView
**File**: `src/components/RoomView.tsx`

```typescript
// Add after the loading check, before rendering
if (racksData.length > 0) {
  console.log('🔍 RoomView Debug - Current View Mode:', viewMode);
  console.log('🔍 Sample Server Data:', racksData[0]?.servers[0]);
  console.log('🔍 Available Fields:', Object.keys(racksData[0]?.servers[0] || {}));
}

// Add visual debugging in the view mode toggle
{/* Enhanced View Mode Toggle with Debug Info */}
<div className="flex items-center gap-4">
  <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
    <SelectTrigger className="w-[140px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="physical">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Physical
        </div>
      </SelectItem>
      <SelectItem value="logical">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Logical
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
  
  {/* Debug indicator */}
  {process.env.NODE_ENV === 'development' && (
    <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
      Current: {viewMode} 
      {racksData[0]?.servers[0] && (
        <span className="ml-2">
          H: {racksData[0].servers[0].hostname ? '✅' : '❌'} 
          IP: {racksData[0].servers[0].ipAddress ? '✅' : '❌'} 
          A: {racksData[0].servers[0].allocation ? '✅' : '❌'}
        </span>
      )}
    </div>
  )}
</div>
```

#### Fix 3: Enhance Server Rendering with Better Logical Display
**File**: `src/components/RoomView.tsx`

```typescript
// Update the logical view display to show more information even if some fields are missing
{viewMode === 'logical' ? (
  // Enhanced Logical View with fallbacks
  <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
    <span className="font-medium text-gray-700 truncate" title={unit.server.hostname || unit.server.id}>
      {unit.server.hostname || `Server-${unit.server.id.slice(-4)}`}
    </span>
    <span className="font-mono text-gray-600 truncate" title={unit.server.ipAddress || 'No IP'}>
      {unit.server.ipAddress || 'N/A'}
    </span>
    <span className="text-gray-500 truncate" title={unit.server.allocation || 'No allocation'}>
      {unit.server.allocation || 'Unassigned'}
    </span>
  </div>
) : (
  // Physical View remains the same
  <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
    <span className="font-mono text-gray-700 truncate">
      {unit.server.serialNumber || 'N/A'}
    </span>
    <span className="text-gray-600 truncate">
      {unit.server.model || 'Unknown'}
    </span>
    <span className="font-mono text-gray-500 truncate">
      {unit.server.ipOOB || 'N/A'}
    </span>
  </div>
)}
```

#### Fix 4: Add Temporary Visual Distinction for Logical View
**File**: `src/components/RoomView.tsx`

```typescript
// Add temporary background color change for logical view (before implementing full color system)
style={unit.server ? {
  minHeight: '24.2px',
  height: '24.2px',
  paddingLeft: '4px',
  paddingRight: '4px',
  marginBottom: '2px',
  backgroundColor: 'black',
  border: '2px solid transparent'
} : {
  minHeight: '24.2px',
  height: '24.2px', 
  paddingLeft: '4px',
  paddingRight: '4px',
  marginBottom: '2px',
  backgroundColor: '#f3f4f6',
  border: '2px solid transparent'
}}

// And update the inner server styling:
className={`flex items-center justify-between rounded w-full hover:bg-gray-50 transition-all duration-200 ${
  viewMode === 'logical' ? 'bg-blue-50 border border-blue-200' : 'bg-white'
}`}
```

#### Fix 5: Create Test Data Utility
**File**: `src/utils/testData.ts`

```typescript
// Utility to verify logical view data
export const validateServerData = (servers: any[]) => {
  const stats = {
    totalServers: servers.length,
    withHostname: servers.filter(s => s.hostname && s.hostname !== '').length,
    withIpAddress: servers.filter(s => s.ipAddress && s.ipAddress !== '').length,
    withAllocation: servers.filter(s => s.allocation && s.allocation !== '').length,
    logicalViewReady: 0
  };
  
  stats.logicalViewReady = servers.filter(s => 
    s.hostname && s.hostname !== '' && 
    s.ipAddress && s.ipAddress !== '' && 
    s.allocation && s.allocation !== ''
  ).length;
  
  console.log('📊 Server Data Analysis:', stats);
  return stats;
};
```

### **Testing Steps:**

1. **Update Migration**: Add the missing logical data to sample servers
2. **Run Migration**: Execute the updated migration to populate logical fields  
3. **Add Debug**: Implement debug logging to see actual data
4. **Test Views**: Switch between physical/logical and verify data display
5. **Fix Issues**: Address any remaining data or display problems
6. **Implement Colors**: Once logical view works, add the color system

### **Expected Results After Fix:**

- ✅ Logical view shows hostnames instead of serial numbers
- ✅ IP addresses display correctly  
- ✅ Allocation types show (IAAS, PAAS, SAAS, etc.)
- ✅ Visual indication that view mode is working
- ✅ Debug information in development mode
- ✅ Fallback values for missing data

### **Implemented Fixes:**

#### ✅ Fix 1: Enhanced Debug System
- **File Created**: `src/utils/debugRoomView.ts`
- **Purpose**: Provides debugging utilities for logical view data
- **Features**: Server data validation, field presence checking, logical view readiness stats

#### ✅ Fix 2: Enhanced RoomView with Logical View Support
- **File Updated**: `src/components/RoomView.tsx`
- **Changes Made**:
  - Added debug logging for logical view data
  - Enhanced logical view display with fallbacks for missing data
  - Added visual distinction for logical mode (blue background/border)
  - Improved hostname, IP address, and allocation display
  - Added tooltips for better UX
  - Color-coded logical fields (blue for IP, purple for allocation)

#### ✅ Fix 3: Data Field Improvements
- **Enhanced logical field display**:
  - Hostname: Shows fallback `Server-${id}` if hostname missing
  - IP Address: Shows 'N/A' with proper styling if missing
  - Allocation: Shows 'Unassigned' if no allocation set
- **Visual enhancements**:
  - Blue background for logical mode
  - Color-coded text fields
  - Improved tooltips

#### ✅ Fix 4: Complete Logical View Implementation
- **Major Addition**: Added dedicated logical view rendering section with identical rack structure
- **Visual Consistency**: Both physical and logical views now use identical rack visualization
- **Styling Updates**:
  - **Removed blue theme**: Server units now use white background (same as physical)
  - **Removed header labels**: No more "- Logical View" labels in headers/footers
  - **Added rack descriptions**: Both views show rack.location as description in headers/footers
  - **Identical structure**: Same rack container, rails, dimensions, and interactions
- **Data Display**:
  - **Physical View**: Serial Number, Model, IP OOB
  - **Logical View**: Hostname, IP Address, Allocation (with color coding)
- **Enhanced server info**: Hostname, IP address, allocation, rack position
- **Status indicators**: Color-coded status dots
- **Interactive elements**: Hover effects and proper tooltips
- **Fallback handling**: Shows meaningful defaults for missing data

#### ✅ Fix 5: Visual Style Unification
- **Consistent Rack Design**: Both views use identical black rack with white rails
- **Consistent Headers**: Rack name + location description in both views
- **White Server Units**: Logical view now uses white background instead of blue
- **Same Interactions**: Identical hover effects and transitions

#### ✅ Fix 5: Development Debug Tools
- **Debug indicator**: Shows field availability status in development
- **Console logging**: Detailed server data analysis
- **Logical view stats**: Counts servers ready for logical view

### **Next Steps (Before Color Implementation):**

1. **Test the fixes**: Verify logical view now works correctly
2. **Check sample data**: Ensure database has logical field values
3. **Validate display**: Confirm hostnames, IPs, and allocations show properly
4. **Debug any issues**: Use the debug tools to identify remaining problems
5. **Proceed with colors**: Once logical view works, implement enum color system

---

### Current System State
- **RoomView Component**: 636 lines with physical/logical view modes
- **Enum Types**: 7 database enums including `allocation_type` and `model_type`
- **Color System**: Basic status colors (Active=green, Maintenance=yellow, Offline=red)
- **Database Schema**: Fixed enum values with potential for dynamic extension

### Desired Functionality
1. **Physical Mode**: Color servers by model type (Dell=blue, HPE=purple, etc.)
2. **Logical Mode**: Color servers by allocation type (IAAS=green, PAAS=orange, etc.)
3. **Fallback Colors**: Default colors for unknown/unmatched values
4. **Accessibility**: WCAG 2.1 compliant color contrasts
5. **Consistency**: Unified color scheme across all views

---

## 🏗️ Implementation Architecture

### Phase 1: Database Schema Enhancement
**Objective**: Add color fields to enum metadata tables

#### 1.1 Create Enum Color Mapping Tables
```sql
-- Add to database migration
CREATE TABLE IF NOT EXISTS public.enum_colors (
  id SERIAL PRIMARY KEY,
  enum_type VARCHAR(50) NOT NULL,
  enum_value VARCHAR(100) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  color_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enum_type, enum_value)
);

-- Insert default model colors
INSERT INTO public.enum_colors (enum_type, enum_value, color_hex, color_name) VALUES
-- Dell Models (Blue Spectrum)
('model_type', 'PowerEdge R740', '#3B82F6', 'Blue'),
('model_type', 'PowerEdge R750', '#1D4ED8', 'Blue-700'),
('model_type', 'PowerEdge R750xd', '#1E40AF', 'Blue-800'),
('model_type', 'PowerVault ME4', '#60A5FA', 'Blue-400'),

-- HPE Models (Purple Spectrum)
('model_type', 'ProLiant DL380', '#8B5CF6', 'Purple'),
('model_type', 'ProLiant DL360', '#7C3AED', 'Purple-600'),
('model_type', 'Apollo 4510', '#6D28D9', 'Purple-700'),

-- Cisco Models (Orange Spectrum)
('model_type', 'ASA 5525-X', '#F97316', 'Orange'),
('model_type', 'Nexus 93180YC-EX', '#EA580C', 'Orange-600'),

-- Juniper Models (Green Spectrum)
('model_type', 'MX204', '#10B981', 'Green'),

-- NetApp Models (Teal Spectrum)
('model_type', 'AFF A400', '#14B8A6', 'Teal'),

-- Generic/Other (Gray Spectrum)
('model_type', 'Other', '#6B7280', 'Gray');

-- Insert default allocation colors
INSERT INTO public.enum_colors (enum_type, enum_value, color_hex, color_name) VALUES
-- Allocation Types
('allocation_type', 'IAAS', '#10B981', 'Green'),        -- Infrastructure
('allocation_type', 'PAAS', '#F59E0B', 'Amber'),        -- Platform
('allocation_type', 'SAAS', '#3B82F6', 'Blue'),         -- Software
('allocation_type', 'Load Balancer', '#8B5CF6', 'Purple'), -- Load Balancer
('allocation_type', 'Database', '#EF4444', 'Red');      -- Database
```

#### 1.2 Enhance Property Definitions Table
```sql
-- Add color support to existing property_definitions table
ALTER TABLE public.property_definitions 
ADD COLUMN IF NOT EXISTS enum_colors JSONB DEFAULT '{}';

-- Update existing properties with default colors
UPDATE public.property_definitions 
SET enum_colors = 
  CASE 
    WHEN property_key = 'allocation' THEN 
      '{"IAAS": "#10B981", "PAAS": "#F59E0B", "SAAS": "#3B82F6", "Load Balancer": "#8B5CF6", "Database": "#EF4444"}'::jsonb
    WHEN property_key = 'model' THEN 
      '{"PowerEdge R740": "#3B82F6", "PowerEdge R750": "#1D4ED8", "ProLiant DL380": "#8B5CF6", "Other": "#6B7280"}'::jsonb
    WHEN property_key = 'status' THEN 
      '{"Active": "#10B981", "Inactive": "#6B7280", "Maintenance": "#F59E0B", "Retired": "#EF4444"}'::jsonb
    ELSE '{}'::jsonb
  END
WHERE property_type IN ('select', 'enum') AND enum_colors IS NULL;
```

#### 1.3 Create Color Management Functions
```sql
-- Function to get colors for enum values
CREATE OR REPLACE FUNCTION public.get_enum_colors(p_enum_type VARCHAR)
RETURNS TABLE(enum_value VARCHAR, color_hex VARCHAR, color_name VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ec.enum_value, ec.color_hex, ec.color_name
  FROM public.enum_colors ec
  WHERE ec.enum_type = p_enum_type
  ORDER BY ec.enum_value;
END;
$$;

-- Function to add/update enum color
CREATE OR REPLACE FUNCTION public.upsert_enum_color(
  p_enum_type VARCHAR,
  p_enum_value VARCHAR,
  p_color_hex VARCHAR,
  p_color_name VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.enum_colors (enum_type, enum_value, color_hex, color_name, updated_at)
  VALUES (p_enum_type, p_enum_value, p_color_hex, p_color_name, NOW())
  ON CONFLICT (enum_type, enum_value)
  DO UPDATE SET 
    color_hex = EXCLUDED.color_hex,
    color_name = EXCLUDED.color_name,
    updated_at = NOW();
END;
$$;
```

### Phase 2: Edge Function Enhancement
**Objective**: Extend existing functions to include color data

#### 2.1 Update get-enums Function
**File**: `volumes/functions/get-enums/index.ts`

```typescript
// Add color fetching capability
interface EnumColor {
  enum_value: string;
  color_hex: string;
  color_name: string;
}

interface EnumWithColors {
  values: string[];
  colors: Record<string, string>; // value -> color mapping
}

// Update the handler to include colors
export const handler = async (req: Request): Promise<Response> => {
  // ... existing code ...

  // Fetch enum colors
  const { data: colorData, error: colorError } = await supabaseClient
    .from('enum_colors')
    .select('enum_type, enum_value, color_hex');

  if (colorError) {
    console.error('Error fetching enum colors:', colorError);
  }

  // Process colors by enum type
  const enumColors: Record<string, Record<string, string>> = {};
  if (colorData) {
    colorData.forEach(row => {
      if (!enumColors[row.enum_type]) {
        enumColors[row.enum_type] = {};
      }
      enumColors[row.enum_type][row.enum_value] = row.color_hex;
    });
  }

  // Enhance enum response with colors
  const enhancedEnumData = { ...enumData };
  Object.keys(enhancedEnumData).forEach(enumType => {
    if (enumColors[enumType]) {
      enhancedEnumData[enumType + '_colors'] = enumColors[enumType];
    }
  });

  return new Response(JSON.stringify(enhancedEnumData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};
```

#### 2.2 Update Property Manager Function
**File**: `volumes/functions/property-manager/index.ts`

```typescript
// Enhance the existing property-manager function to handle colors

const propertyManagerHandler = async (req: Request): Promise<Response> => {
  // ... existing CORS and auth code ...

  const { name, key, type, enumType, description, required, options, default_value, enumColors } = await req.json();

  if (req.method === 'POST') {
    // Create new property with colors
    const { data, error } = await supabaseClient
      .from('property_definitions')
      .insert({
        property_name: name,
        property_key: key,
        property_type: type,
        enum_type: enumType,
        description: description || null,
        required: required || false,
        options: options || null,
        default_value: default_value || null,
        enum_colors: enumColors || {}, // Store user-defined colors
        category: 'custom',
        sort_order: 999
      })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'PATCH') {
    // Update colors for existing property
    const { propertyKey, colors } = await req.json();
    
    const { data, error } = await supabaseClient
      .from('property_definitions')
      .update({ enum_colors: colors })
      .eq('property_key', propertyKey)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ... existing DELETE and GET methods ...
};
```

#### 2.3 Create Update Enum Colors Function
**File**: `volumes/functions/update-enum-colors/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { enum_type, colors } = await req.json()

    if (!enum_type || !colors) {
      throw new Error('enum_type and colors are required')
    }

    // Update colors in property_definitions table
    const { data, error } = await supabaseClient
      .from('property_definitions')
      .update({ enum_colors: colors })
      .eq('property_key', enum_type)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Also update enum_colors table for compatibility
    const colorEntries = Object.entries(colors).map(([value, color]) => ({
      enum_type,
      enum_value: value,
      color_hex: color as string,
      updated_at: new Date().toISOString()
    }))

    // Delete existing colors for this enum
    await supabaseClient
      .from('enum_colors')
      .delete()
      .eq('enum_type', enum_type)

    // Insert new colors
    if (colorEntries.length > 0) {
      await supabaseClient
        .from('enum_colors')
        .insert(colorEntries)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Colors updated successfully',
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error updating enum colors:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}
```

### Phase 3: Frontend Hooks and Utilities
**Objective**: Create reusable color management system

#### 3.1 Enhanced Property Definitions Hook
**File**: `src/hooks/usePropertyDefinitions.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PropertyDefinition {
  id: string;
  property_name: string;
  property_key: string;
  property_type: string;
  options?: string[];
  enum_colors?: Record<string, string>; // Add color support
  required: boolean;
  description?: string;
}

export const usePropertyDefinitions = () => {
  const [properties, setProperties] = useState<PropertyDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_definitions')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getPropertyColors = (propertyKey: string): Record<string, string> => {
    const property = properties.find(p => p.property_key === propertyKey);
    return property?.enum_colors || {};
  };

  const updatePropertyColors = async (propertyKey: string, colors: Record<string, string>) => {
    try {
      const { error } = await supabase.functions.invoke('update-enum-colors', {
        body: { enum_type: propertyKey, colors }
      });

      if (error) throw error;

      // Update local state
      setProperties(prev => prev.map(prop => 
        prop.property_key === propertyKey 
          ? { ...prop, enum_colors: colors }
          : prop
      ));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    loading,
    error,
    refetch: fetchProperties,
    getPropertyColors,
    updatePropertyColors
  };
};
```

#### 3.2 Create Color Management Hook
**File**: `src/hooks/useEnumColors.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EnumColorMap {
  [enumType: string]: {
    [enumValue: string]: {
      hex: string;
      name: string;
    };
  };
}

interface UseEnumColorsReturn {
  colors: EnumColorMap;
  loading: boolean;
  error: string | null;
  getColor: (enumType: string, enumValue: string) => string;
  getColorWithFallback: (enumType: string, enumValue: string, fallback?: string) => string;
  refetch: () => Promise<void>;
}

// Default color palette for fallbacks
const DEFAULT_COLORS = {
  model_type: {
    'PowerEdge R740': '#3B82F6',
    'PowerEdge R750': '#1D4ED8',
    'PowerEdge R750xd': '#1E40AF',
    'PowerVault ME4': '#60A5FA',
    'ProLiant DL380': '#8B5CF6',
    'ProLiant DL360': '#7C3AED',
    'Apollo 4510': '#6D28D9',
    'ASA 5525-X': '#F97316',
    'Nexus 93180YC-EX': '#EA580C',
    'MX204': '#10B981',
    'AFF A400': '#14B8A6',
    'Other': '#6B7280'
  },
  allocation_type: {
    'IAAS': '#10B981',
    'PAAS': '#F59E0B',
    'SAAS': '#3B82F6',
    'Load Balancer': '#8B5CF6',
    'Database': '#EF4444'
  }
};

export const useEnumColors = (): UseEnumColorsReturn => {
  const [colors, setColors] = useState<EnumColorMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from Edge Function first
      const { data, error } = await supabase.functions.invoke('get-enum-colors');
      
      if (error) {
        console.warn('Edge function failed, using defaults:', error);
        setColors(DEFAULT_COLORS);
      } else {
        setColors(data || DEFAULT_COLORS);
      }
    } catch (err) {
      console.error('Error fetching enum colors:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setColors(DEFAULT_COLORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const getColor = (enumType: string, enumValue: string): string => {
    return colors[enumType]?.[enumValue]?.hex || '';
  };

  const getColorWithFallback = (enumType: string, enumValue: string, fallback = '#6B7280'): string => {
    return colors[enumType]?.[enumValue]?.hex || fallback;
  };

  return {
    colors,
    loading,
    error,
    getColor,
    getColorWithFallback,
    refetch: fetchColors
  };
};
```

#### 3.2 Create Color Utility Functions
**File**: `src/utils/colorUtils.ts`

```typescript
// Color utility functions for enum coloring

/**
 * Convert hex color to RGB values
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Calculate luminance for accessibility
 */
export const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

/**
 * Get contrasting text color (black or white) for given background
 */
export const getContrastTextColor = (backgroundColor: string): string => {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Generate CSS custom properties for Tailwind
 */
export const generateColorCSS = (colorMap: Record<string, string>): string => {
  return Object.entries(colorMap)
    .map(([key, value]) => `--color-${key.toLowerCase().replace(/\s+/g, '-')}: ${value};`)
    .join('\n');
};

/**
 * Create Tailwind-compatible background color class
 */
export const createTailwindBgClass = (hex: string): string => {
  // For dynamic colors, we'll use style prop instead of class
  return `background-color: ${hex}`;
};

/**
 * Color palette for different enum types
 */
export const COLOR_PALETTES = {
  allocation: {
    'IAAS': '#10B981',      // Emerald-500 - Infrastructure (stable/foundational)
    'PAAS': '#F59E0B',      // Amber-500 - Platform (middle layer)
    'SAAS': '#3B82F6',      // Blue-500 - Software (top layer)
    'Load Balancer': '#8B5CF6',  // Purple-500 - Network service
    'Database': '#EF4444'   // Red-500 - Critical data service
  },
  model: {
    // Dell - Blue spectrum (market leader)
    'PowerEdge R740': '#3B82F6',
    'PowerEdge R750': '#1D4ED8',
    'PowerEdge R750xd': '#1E40AF',
    'PowerVault ME4': '#60A5FA',
    
    // HPE - Purple spectrum (enterprise)
    'ProLiant DL380': '#8B5CF6',
    'ProLiant DL360': '#7C3AED',
    'Apollo 4510': '#6D28D9',
    
    // Cisco - Orange spectrum (networking)
    'ASA 5525-X': '#F97316',
    'Nexus 93180YC-EX': '#EA580C',
    
    // Juniper - Green spectrum (network infrastructure)
    'MX204': '#10B981',
    
    // NetApp - Teal spectrum (storage)
    'AFF A400': '#14B8A6',
    
    // Generic/Other - Gray spectrum
    'Other': '#6B7280'
  }
} as const;

/**
 * Get default color for enum value with fallback
 */
export const getDefaultEnumColor = (enumType: string, enumValue: string): string => {
  const palette = COLOR_PALETTES[enumType as keyof typeof COLOR_PALETTES];
  return palette?.[enumValue as keyof typeof palette] || '#6B7280';
};
```

### Phase 4: ServerProperties Enhancement for Color Management
**Objective**: Add color selection capability to ServerProperties component

#### 4.1 Update ServerProperty Interface
**File**: `src/components/ServerProperties.tsx`

```typescript
export interface ServerProperty {
  id?: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "enum";
  required: boolean;
  visible: boolean;
  options?: string[];
  enumType?: string;
  enumTypeName?: string;
  enumValues?: string[];
  enumColors?: Record<string, string>; // NEW: Color mapping for enum values
  is_enum?: boolean;
  isSystem?: boolean;
  column_default?: string | null;
  category?: string;
  default_value?: string;
  description?: string;
}
```

#### 4.2 Add Color Management to Enum Creation
**Enhancement to existing enum creation form:**

```typescript
// Add to enum creation section in ServerProperties
const renderEnumColorSelector = () => {
  if (newColumn.type !== 'enum' || !newColumn.enumValues?.length) return null;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Enum Value Colors</Label>
      <div className="space-y-2">
        {newColumn.enumValues.map((value, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
            <div className="flex-1">
              <span className="text-sm font-medium">{value || `Value ${idx + 1}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColumn.enumColors?.[value] || getDefaultEnumColor('model', value)}
                onChange={(e) => {
                  setNewColumn(prev => ({
                    ...prev,
                    enumColors: {
                      ...prev.enumColors,
                      [value]: e.target.value
                    }
                  }));
                }}
                className="w-8 h-8 rounded border cursor-pointer"
                title={`Color for ${value}`}
              />
              <Input
                type="text"
                value={newColumn.enumColors?.[value] || ''}
                onChange={(e) => {
                  setNewColumn(prev => ({
                    ...prev,
                    enumColors: {
                      ...prev.enumColors,
                      [value]: e.target.value
                    }
                  }));
                }}
                placeholder="#000000"
                className="w-20 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const randomColors = generateRandomColors(newColumn.enumValues?.length || 0);
            setNewColumn(prev => ({
              ...prev,
              enumColors: newColumn.enumValues?.reduce((acc, value, idx) => ({
                ...acc,
                [value]: randomColors[idx]
              }), {}) || {}
            }));
          }}
        >
          🎨 Generate Random Colors
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const paletteColors = getColorPalette(newColumn.key || '');
            setNewColumn(prev => ({
              ...prev,
              enumColors: newColumn.enumValues?.reduce((acc, value, idx) => ({
                ...acc,
                [value]: paletteColors[idx] || getDefaultEnumColor(newColumn.key || '', value)
              }), {}) || {}
            }));
          }}
        >
          🎨 Apply Default Palette
        </Button>
      </div>
    </div>
  );
};

// Color utility functions for ServerProperties
const generateRandomColors = (count: number): string[] => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360 / count) % 360;
    const saturation = 60 + Math.random() * 30; // 60-90%
    const lightness = 45 + Math.random() * 20;  // 45-65%
    colors.push(hslToHex(hue, saturation, lightness));
  }
  return colors;
};

const getColorPalette = (enumType: string): string[] => {
  const palettes = {
    model: ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EF4444'],
    allocation: ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444'],
    status: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6', '#14B8A6'],
    environment: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
    device_type: ['#3B82F6', '#10B981', '#F97316']
  };
  
  return palettes[enumType as keyof typeof palettes] || 
         ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EF4444'];
};

const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
```

#### 4.3 Add Color Preview and Management
**Enhancement to existing property display:**

```typescript
// Update the property display section to show colors
const renderPropertyColors = (property: ServerProperty) => {
  if (!property.is_enum || !property.options?.length) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600">Colors:</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setSelectedPropertyForColors(property);
            setIsColorManagementOpen(true);
          }}
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit Colors
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {property.options.map((value) => (
          <div
            key={value}
            className="flex items-center gap-2 px-2 py-1 rounded-md border bg-gray-50"
          >
            <div
              className="w-4 h-4 rounded border"
              style={{
                backgroundColor: property.enumColors?.[value] || getDefaultEnumColor(property.key, value)
              }}
            />
            <span className="text-xs">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 4.4 Create Color Management Dialog
**New dialog component for editing enum colors:**

```typescript
// Add to ServerProperties component
const ColorManagementDialog = () => {
  const [tempColors, setTempColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedPropertyForColors) {
      setTempColors(selectedPropertyForColors.enumColors || {});
    }
  }, [selectedPropertyForColors]);

  const handleSaveColors = async () => {
    if (!selectedPropertyForColors) return;

    try {
      setIsSubmitting(true);
      
      // Save colors to database
      const { error } = await supabase.functions.invoke('update-enum-colors', {
        body: {
          enum_type: selectedPropertyForColors.key,
          colors: tempColors
        }
      });

      if (error) throw error;

      // Update local state
      setProperties(prev => prev.map(prop => 
        prop.key === selectedPropertyForColors.key 
          ? { ...prop, enumColors: tempColors }
          : prop
      ));

      toast({
        title: "Colors Updated",
        description: "Enum colors have been saved successfully"
      });

      setIsColorManagementOpen(false);
    } catch (error) {
      console.error('Error saving colors:', error);
      toast({
        title: "Error",
        description: "Failed to save colors",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isColorManagementOpen} onOpenChange={setIsColorManagementOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Colors: {selectedPropertyForColors?.name}</DialogTitle>
          <DialogDescription>
            Customize colors for each enum value. These colors will be used in visualizations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {selectedPropertyForColors?.options?.map((value) => (
            <div key={value} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium">{value}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={tempColors[value] || getDefaultEnumColor(selectedPropertyForColors.key, value)}
                  onChange={(e) => {
                    setTempColors(prev => ({
                      ...prev,
                      [value]: e.target.value
                    }));
                  }}
                  className="w-10 h-8 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={tempColors[value] || ''}
                  onChange={(e) => {
                    setTempColors(prev => ({
                      ...prev,
                      [value]: e.target.value
                    }));
                  }}
                  placeholder="#000000"
                  className="w-24 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const randomColors = generateRandomColors(selectedPropertyForColors?.options?.length || 0);
                const newColors = selectedPropertyForColors?.options?.reduce((acc, value, idx) => ({
                  ...acc,
                  [value]: randomColors[idx]
                }), {}) || {};
                setTempColors(newColors);
              }}
            >
              🎲 Random
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const paletteColors = getColorPalette(selectedPropertyForColors?.key || '');
                const newColors = selectedPropertyForColors?.options?.reduce((acc, value, idx) => ({
                  ...acc,
                  [value]: paletteColors[idx] || getDefaultEnumColor(selectedPropertyForColors?.key || '', value)
                }), {}) || {};
                setTempColors(newColors);
              }}
            >
              🎨 Palette
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsColorManagementOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveColors}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Colors'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

#### 4.5 Add Required State Variables
**Add to component state:**

```typescript
// Add to ServerProperties component state
const [isColorManagementOpen, setIsColorManagementOpen] = useState(false);
const [selectedPropertyForColors, setSelectedPropertyForColors] = useState<ServerProperty | null>(null);
```

### Phase 5: RoomView Component Enhancement
**Objective**: Integrate color system into RoomView component

#### 5.1 Update RoomView Component
**File**: `src/components/RoomView.tsx`

Based on the current RoomView.tsx structure, here's the complete integration:

```typescript
// Add these imports at the top
import { useEnumColors } from "@/hooks/useEnumColors";
import { getContrastTextColor, getDefaultEnumColor } from "@/utils/colorUtils";

// Add color management inside the RoomView component
const RoomView = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("physical");
  const racksPerPage = 12;

  // Use hierarchical filter hook but only up to room level
  const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
  
  // Real data from backend hook
  const { racksData, loading, error } = useRoomData(filters);
  
  // ADD: Color management system
  const { colors, getColorWithFallback } = useEnumColors();

  // ADD: Enhanced color functions for server visualization
  const getServerBackgroundColor = (server: ServerInfo, mode: ViewMode): string => {
    if (mode === 'physical') {
      // Physical mode: color by model
      return getColorWithFallback('model_type', server.model, getDefaultEnumColor('model', server.model));
    } else {
      // Logical mode: color by allocation
      return getColorWithFallback('allocation_type', server.allocation || '', getDefaultEnumColor('allocation', server.allocation || ''));
    }
  };

  const getServerTextColor = (server: ServerInfo, mode: ViewMode): string => {
    const bgColor = getServerBackgroundColor(server, mode);
    return getContrastTextColor(bgColor);
  };

  // ADD: Helper function to create server unit style with colors
  const getServerUnitStyle = (server: ServerInfo, isMultiUnit: boolean = false) => {
    const backgroundColor = getServerBackgroundColor(server, viewMode);
    const textColor = getServerTextColor(server, viewMode);
    
    const baseStyle = {
      backgroundColor,
      color: textColor,
      minHeight: isMultiUnit ? `${(server.unitHeight * 24.2) - 8}px` : '16.2px',
      height: isMultiUnit ? `${(server.unitHeight * 24.2) - 8}px` : '16.2px',
      paddingLeft: '4px',
      paddingRight: '4px',
      paddingTop: '4px',
      paddingBottom: '4px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      cursor: 'pointer',
      overflow: 'hidden',
      border: `1px solid ${backgroundColor}dd`,
      borderRadius: '4px'
    };

    return { baseStyle, textColor };
  };

  // ... existing loading and error states ...
}
```

#### 5.2 Update Multi-Unit Server Rendering
**Replace the multi-unit server rendering section (around line 400-450):**

```typescript
// Multi-unit server rendering with color integration
if (unit.server && unit.server.unitHeight > 1) {
  const { baseStyle, textColor } = getServerUnitStyle(unit.server, true);
  
  return (
    <div
      key={index}
      className="flex items-center transition-colors rounded"
      style={{
        minHeight: `${(unit.server.unitHeight * 24.2)}px`,
        height: `${(unit.server.unitHeight * 24.2)}px`,
        paddingLeft: '4px',
        paddingRight: '4px',
        marginBottom: '2px',
        backgroundColor: 'black',
        border: '2px solid transparent'
      }}
    >
      <div className="flex-1 flex items-center">
        <div 
          className="flex items-center justify-between rounded w-full hover:opacity-80 transition-all duration-200"
          style={baseStyle}
        >
          <div className="flex items-center space-x-2 w-full h-full">
            <div className="text-[8px] font-mono flex-shrink-0 text-right" style={{ color: textColor }}>
              U{unit.unit}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              {viewMode === 'physical' ? (
                <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                  <span className="font-mono truncate" style={{ color: textColor }}>
                    {unit.server.serialNumber || 'N/A'}
                  </span>
                  <span className="truncate" style={{ color: `${textColor}dd` }}>
                    {unit.server.model || 'Unknown'}
                  </span>
                  <span className="font-mono truncate" style={{ color: `${textColor}cc` }}>
                    {unit.server.ipOOB || 'N/A'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                  <span className="font-medium truncate" style={{ color: textColor }}>
                    {unit.server.hostname}
                  </span>
                  <span className="font-mono truncate" style={{ color: `${textColor}dd` }}>
                    {unit.server.ipAddress || 'N/A'}
                  </span>
                  <span className="truncate" style={{ color: `${textColor}cc` }}>
                    {unit.server.allocation || 'N/A'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 5.3 Update Single-Unit Server Rendering  
**Replace the single-unit server rendering section (around line 450-520):**

```typescript
// Single unit server rendering with color integration
return (
  <div
    key={index}
    className="flex items-center transition-colors rounded"
    style={unit.server ? {
      minHeight: '24.2px',
      height: '24.2px',
      paddingLeft: '4px',
      paddingRight: '4px',
      marginBottom: '2px',
      backgroundColor: 'black',
      border: '2px solid transparent'
    } : {
      minHeight: '24.2px',
      height: '24.2px', 
      paddingLeft: '4px',
      paddingRight: '4px',
      marginBottom: '2px',
      backgroundColor: '#f3f4f6',
      border: '2px solid transparent'
    }}
  >
    {unit.server ? (
      <div className="flex-1 flex items-center">
        {(() => {
          const { baseStyle, textColor } = getServerUnitStyle(unit.server, false);
          return (
            <div 
              className="flex items-center justify-between rounded w-full hover:opacity-80 transition-all duration-200"
              style={baseStyle}
            >
              <div className="flex items-center space-x-2 w-full h-full">
                <div className="text-[8px] font-mono flex-shrink-0 text-right" style={{ color: textColor }}>
                  U{unit.unit}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  {viewMode === 'physical' ? (
                    <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                      <span className="font-mono truncate" style={{ color: textColor }}>
                        {unit.server.serialNumber || 'N/A'}
                      </span>
                      <span className="truncate" style={{ color: `${textColor}dd` }}>
                        {unit.server.model || 'Unknown'}
                      </span>
                      <span className="font-mono truncate" style={{ color: `${textColor}cc` }}>
                        {unit.server.ipOOB || 'N/A'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 h-full overflow-hidden text-[8px]">
                      <span className="font-medium truncate" style={{ color: textColor }}>
                        {unit.server.hostname}
                      </span>
                      <span className="font-mono truncate" style={{ color: `${textColor}dd` }}>
                        {unit.server.ipAddress || 'N/A'}
                      </span>
                      <span className="truncate" style={{ color: `${textColor}cc` }}>
                        {unit.server.allocation || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(unit.server.status)}`}></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    ) : (
      // Empty unit rendering remains the same
      <div className="flex-1 flex items-center">
        <div 
          className="flex items-center justify-between rounded w-full"
          style={{
            minHeight: '16.2px',
            height: '16.2px',
            paddingLeft: '4px',
            paddingRight: '4px',
            paddingTop: '4px',
            paddingBottom: '4px',
            backgroundColor: '#f3f4f6',
            overflow: 'hidden'
          }}
        >
          <div className="flex items-center space-x-2 w-full h-full">
            <div className="text-[8px] font-mono text-gray-500 flex-shrink-0" style={{
              width: '24px',
              textAlign: 'right'
            }}>
              U{unit.unit}
            </div>
            <div className="flex-1 overflow-hidden" style={{
              marginLeft: '8px'
            }}>
              <div className="text-[8px] text-gray-400 italic leading-none">Empty</div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
```
```

#### 5.4 Add Color Legend to RoomView
**Add the color legend above the rack layout:**

```typescript
// Add this section before the rack layout, after the summary cards
{/* Color Legend */}
{racksData.length > 0 && (
  <div className="bg-white p-4 rounded-lg border">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium text-gray-700">
        Color Legend - {viewMode === 'physical' ? 'Server Models' : 'Allocation Types'}
      </h3>
      <Badge variant="outline" className="text-xs">
        {viewMode === 'physical' ? 'Physical View' : 'Logical View'}
      </Badge>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {viewMode === 'physical' ? (
        // Show model colors
        Object.entries(colors.model_type || {}).map(([model, colorInfo]) => (
          <div key={model} className="flex items-center gap-2 px-2 py-1 rounded border bg-gray-50">
            <div
              className="w-3 h-3 rounded border flex-shrink-0"
              style={{ backgroundColor: colorInfo.hex }}
            />
            <span className="text-xs truncate" title={model}>{model}</span>
          </div>
        ))
      ) : (
        // Show allocation colors
        Object.entries(colors.allocation_type || {}).map(([allocation, colorInfo]) => (
          <div key={allocation} className="flex items-center gap-2 px-2 py-1 rounded border bg-gray-50">
            <div
              className="w-3 h-3 rounded border flex-shrink-0"
              style={{ backgroundColor: colorInfo.hex }}
            />
            <span className="text-xs truncate" title={allocation}>{allocation}</span>
          </div>
        ))
      )}
    </div>
    
    {/* Additional Legend Items */}
    <div className="mt-3 pt-3 border-t">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-gray-600">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-600">Offline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border bg-gray-200"></div>
          <span className="text-xs text-gray-600">Empty Unit</span>
        </div>
      </div>
    </div>
  </div>
)}
```

#### 5.5 Add Color Mode Toggle Enhancement
**Enhance the view mode selector to show color preview:**

```typescript
{/* Enhanced View Mode Toggle with Color Preview */}
<div className="flex items-center gap-2">
  <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
    <SelectTrigger className="w-[160px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="physical">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>Physical</span>
          <div className="flex gap-1 ml-2">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#F97316' }}></div>
          </div>
        </div>
      </SelectItem>
      <SelectItem value="logical">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          <span>Logical</span>
          <div className="flex gap-1 ml-2">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <div className="w-2 h-2 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
          </div>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
  
  {/* Quick color preview */}
  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
    <span className="text-gray-600">Colors by:</span>
    <span className="font-medium">
      {viewMode === 'physical' ? 'Model' : 'Allocation'}
    </span>
  </div>
</div>
```

#### 5.6 Add Performance Optimization
**Add memoization for color calculations:**

```typescript
import { useState, useMemo } from "react";

// Add inside RoomView component
const memoizedServerColors = useMemo(() => {
  const serverColorMap = new Map();
  
  racksData.forEach(rack => {
    rack.servers.forEach(server => {
      const physicalColor = getServerBackgroundColor(server, 'physical');
      const logicalColor = getServerBackgroundColor(server, 'logical');
      const physicalTextColor = getContrastTextColor(physicalColor);
      const logicalTextColor = getContrastTextColor(logicalColor);
      
      serverColorMap.set(server.id, {
        physical: { bg: physicalColor, text: physicalTextColor },
        logical: { bg: logicalColor, text: logicalTextColor }
      });
    });
  });
  
  return serverColorMap;
}, [racksData, colors, viewMode]);

// Update the color helper functions to use memoized colors
const getServerColors = (serverId: string) => {
  return memoizedServerColors.get(serverId)?.[viewMode] || {
    bg: '#6B7280',
    text: '#FFFFFF'
  };
};
```

#### 5.7 Add Responsive Color Display
**Optimize color display for mobile devices:**

```typescript
// Add responsive color legend
{/* Responsive Color Legend */}
{racksData.length > 0 && (
  <div className="bg-white p-3 md:p-4 rounded-lg border">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
      <h3 className="text-sm font-medium text-gray-700">
        Color Legend - {viewMode === 'physical' ? 'Server Models' : 'Allocation Types'}
      </h3>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {viewMode === 'physical' ? 'Physical View' : 'Logical View'}
        </Badge>
        <Button
          variant="ghost" 
          size="sm"
          className="sm:hidden text-xs h-6"
          onClick={() => {
            // Toggle legend collapse on mobile
            const legend = document.getElementById('color-legend-content');
            if (legend) {
              legend.classList.toggle('hidden');
            }
          }}
        >
          Toggle
        </Button>
      </div>
    </div>
    
    <div id="color-legend-content" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {/* Color legend content */}
    </div>
  </div>
)}
```

### Phase 6: Admin Interface Enhancement
**Objective**: Allow administrators to manage enum colors globally

#### 6.1 Create Color Management Component
**File**: `src/components/admin/EnumColorManager.tsx`

```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnumColors } from '@/hooks/useEnumColors';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EnumColorManager: React.FC = () => {
  const { colors, refetch } = useEnumColors();
  const { toast } = useToast();
  const [selectedEnumType, setSelectedEnumType] = useState<string>('');
  const [selectedEnumValue, setSelectedEnumValue] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('#000000');

  const enumTypes = ['model_type', 'allocation_type'];

  const handleColorUpdate = async () => {
    if (!selectedEnumType || !selectedEnumValue || !newColor) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('update-enum-color', {
        body: {
          enum_type: selectedEnumType,
          enum_value: selectedEnumValue,
          color_hex: newColor
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Color updated successfully"
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update color",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enum Color Management</CardTitle>
        <CardDescription>
          Manage colors for enum values used in visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="enum-type">Enum Type</Label>
            <Select value={selectedEnumType} onValueChange={setSelectedEnumType}>
              <SelectTrigger>
                <SelectValue placeholder="Select enum type" />
              </SelectTrigger>
              <SelectContent>
                {enumTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="enum-value">Enum Value</Label>
            <Select 
              value={selectedEnumValue} 
              onValueChange={setSelectedEnumValue}
              disabled={!selectedEnumType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select enum value" />
              </SelectTrigger>
              <SelectContent>
                {selectedEnumType && colors[selectedEnumType] && 
                  Object.keys(colors[selectedEnumType]).map(value => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-20"
            />
            <Input
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <Button onClick={handleColorUpdate} className="w-full">
          Update Color
        </Button>

        {/* Color Preview */}
        {selectedEnumType && colors[selectedEnumType] && (
          <div className="mt-6">
            <Label>Current Colors</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(colors[selectedEnumType]).map(([value, colorInfo]) => (
                <div
                  key={value}
                  className="flex items-center gap-2 px-3 py-1 border rounded"
                >
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: colorInfo.hex }}
                  />
                  <span className="text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnumColorManager;
```

---

## 🚀 Implementation Timeline

### Week 1: Database Foundation
- [ ] **Day 1-2**: Create enum_colors table and functions
- [ ] **Day 3**: Insert default color mappings
- [ ] **Day 4-5**: Test database functions and migrations

### Week 2: Backend Integration
- [ ] **Day 1-2**: Create get-enum-colors edge function
- [ ] **Day 3**: Update existing get-enums function
- [ ] **Day 4-5**: Test edge function integration

### Week 3: Frontend Development
- [ ] **Day 1-2**: Create useEnumColors hook
- [ ] **Day 3**: Implement color utility functions
- [ ] **Day 4-5**: Create ColorLegend component

### Week 4: ServerProperties Enhancement
- [ ] **Day 1-2**: Add color selection to enum creation
- [ ] **Day 3**: Implement color management dialog
- [ ] **Day 4-5**: Add color preview and editing features

### Week 5: RoomView Integration
- [ ] **Day 1-3**: Update RoomView with color system
- [ ] **Day 4**: Add color legend to RoomView
- [ ] **Day 5**: Testing and refinement

### Week 6: Admin Interface
- [ ] **Day 1-3**: Create EnumColorManager component
- [ ] **Day 4**: Integrate with admin panel
- [ ] **Day 5**: Final testing and documentation

---

## 📋 Testing Strategy

### Unit Tests
```typescript
// Test color utility functions
describe('Color Utils', () => {
  test('hexToRgb converts correctly', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('getContrastTextColor returns white for dark backgrounds', () => {
    expect(getContrastTextColor('#000000')).toBe('#FFFFFF');
  });

  test('getDefaultEnumColor returns fallback for unknown values', () => {
    expect(getDefaultEnumColor('model', 'Unknown')).toBe('#6B7280');
  });
});
```

### Integration Tests
- Test database functions with sample data
- Verify edge function responses
- Test RoomView color rendering with different modes

### Visual Tests
- Color contrast accessibility compliance
- Color consistency across different screen sizes
- Fallback behavior when colors are unavailable

---

## 🔧 Configuration

### Environment Variables
```bash
# Add to .env if needed
ENABLE_ENUM_COLORS=true
DEFAULT_FALLBACK_COLOR="#6B7280"
```

### Feature Flags
```typescript
// Add to feature configuration
export const FEATURES = {
  ENUM_COLORING: true,
  COLOR_LEGEND: true,
  ADMIN_COLOR_MANAGEMENT: true
};
```

---

## 📊 Performance Considerations

### Optimization Strategies
1. **Color Caching**: Cache enum colors in localStorage
2. **Lazy Loading**: Load colors only when needed
3. **CSS Variables**: Use CSS custom properties for performance
4. **Memoization**: Memoize color calculations

### Monitoring
- Track color loading times
- Monitor database query performance
- Measure RoomView render times

---

## ♿ Accessibility Requirements

### WCAG 2.1 Compliance
- **Contrast Ratio**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Blind Friendly**: Use patterns or shapes in addition to colors
- **Keyboard Navigation**: Ensure color legend is keyboard accessible

### Implementation
```typescript
// Example contrast checking
const isContrastCompliant = (background: string, foreground: string): boolean => {
  const bgLuminance = getLuminance(background);
  const fgLuminance = getLuminance(foreground);
  const contrast = (Math.max(bgLuminance, fgLuminance) + 0.05) / 
                   (Math.min(bgLuminance, fgLuminance) + 0.05);
  return contrast >= 4.5;
};
```

---

## 🔄 Migration and Rollback Plan

### Migration Steps
1. **Database**: Add enum_colors table (non-breaking)
2. **Functions**: Deploy new edge functions (additive)
3. **Frontend**: Deploy with feature flag disabled
4. **Enable**: Gradually enable color features
5. **Monitor**: Watch for performance issues

### Rollback Strategy
- Feature flags for quick disable
- Database rollback scripts ready
- Frontend fallback to existing status colors
- Edge function versioning for safe rollback

---

## 📈 Success Metrics

### User Experience Features
1. **Visual Color Picker**: Color wheel/palette interface in ServerProperties
2. **Real-time Preview**: Immediate color preview in forms
3. **Smart Defaults**: Automatic color palette generation
4. **Color Accessibility**: Contrast checking and colorblind-friendly options
5. **Bulk Color Management**: Apply color schemes to multiple enum values

### Key User Workflows
1. **Creating Enum with Colors**:
   - User adds new enum property in ServerProperties
   - System provides default color palette
   - User can customize individual colors with color picker
   - Colors are saved with the enum definition

2. **Managing Existing Colors**:
   - User clicks "Edit Colors" on any enum property
   - Color management dialog opens
   - User can adjust colors with picker or hex input
   - Changes are saved and immediately reflected in visualizations

3. **Applying Color Themes**:
   - Random color generation for variety
   - Predefined palettes for consistency
   - Smart color selection based on enum type

### Enhanced User Interface
- **Color Picker Integration**: Native browser color input with hex backup
- **Visual Feedback**: Live preview of colors on enum values
- **Accessibility Tools**: Contrast checker and colorblind simulation
- **Batch Operations**: Apply colors to multiple enums at once

### Technical Metrics
- **Performance**: Page load times remain under 2 seconds
- **Reliability**: 99.9% uptime for color loading
- **Scalability**: Support for additional enum types

---

## 🎯 Future Enhancements

### Phase 2 Features
1. **Custom Color Themes**: User-defined color schemes
2. **Color Analytics**: Usage patterns and preferences
3. **Bulk Color Import**: CSV-based color management
4. **Advanced Patterns**: Gradients, patterns, textures

### Integration Opportunities
- **Dashboard Charts**: Use same colors in analytics
- **Reports**: Color-coded export formats
- **Mobile App**: Consistent color scheme
- **API**: Color data for third-party integrations

---

*This implementation plan provides a comprehensive roadmap for adding sophisticated color-coding capabilities to the AssetDex-DCIM system, enhancing visual identification and user experience while maintaining system reliability and performance.*
