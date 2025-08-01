# Plan: Integrate RoomView.tsx with Actual Data

## Goal
Integrate `RoomView.tsx` so it fetches and displays real rack and server data from the backend, replacing mock data and ensuring the UI reflects the current state of the database.

## Steps

1. **Analyze Current RoomView.tsx**
   - Identify all places where mock data is generated (e.g., racks, servers).
   - List all props, hooks, and data dependencies.

2. **Backend API Review**
   - Confirm available endpoints for racks, servers, and room metadata (e.g., `/api/racks`, `/api/servers`, `/api/rooms`).
   - Ensure endpoints support filtering by site, building, floor, and room.

3. **Replace Mock Data with API Calls**
   - Use `useEffect` or React Query to fetch racks and servers based on current filters.
   - Handle loading, error, and empty states.

4. **Update Data Mapping Logic**
   - Map API response data to the expected structure for rack and server rendering.
   - Ensure all fields (rack name, utilization, server positions, etc.) are correctly displayed.

5. **Integrate Filters**
   - Connect filter controls to backend data so changing filters triggers new API requests.
   - Ensure pagination and hierarchical filters work with real data.

6. **Testing**
   - Test with real backend data for various rooms, racks, and filter combinations.
   - Validate that the UI updates correctly and matches the database state.

7. **Performance & Error Handling**
   - Add loading spinners, error messages, and fallback UI for empty states.
   - Optimize API calls to avoid unnecessary requests.

## Reference: RackView.tsx vs RoomView.tsx Analysis

### Key Differences Found:
- **RackView.tsx:** Uses `useRackData` hook to fetch real data from backend Edge Functions for a single rack
- **RoomView.tsx:** Uses mock data generation in `useEffect` - creates 20 empty racks with no servers
- **Data Structure:** RackView displays detailed server positions within a single rack; RoomView shows multiple racks in a grid layout
- **Backend Integration:** RackView is fully integrated with backend; RoomView still uses mock data

### RackView.tsx Integration Patterns (Correct Implementation):
- **Dynamic Data Fetching:** Uses hooks (`useRackData`, `useHierarchicalFilter`) to fetch rack and server data from backend Edge Functions, not mock data.
- **Real Server Data:** Displays actual servers with positions, specifications, and status from database
- **Hierarchical Filtering:** All filter dropdowns populated dynamically from backend data via `hierarchyData`
- **Statistics & Visualization:** Rack statistics and server info rendered from backend data, not hardcoded values

### RoomView.tsx Current Issues (Needs Fix):
- **Mock Data:** Still generates 20 empty racks with no real server data
- **No Backend Integration:** Uses hardcoded rack creation instead of fetching from database
- **Missing Server Data:** Shows empty racks instead of actual server positions and details

---
## Revised Plan: Integrate RoomView.tsx with Actual Data

### 1. Replace Mock Data Generation
- **Current Issue:** RoomView generates 20 empty racks in `useEffect` with hardcoded data
- **Solution:** Replace mock rack generation with real backend data fetching
- **Code to Remove:**
  ```tsx
  // Lines 101-120 in RoomView.tsx - Mock data generation
  const mockRacks: RackInfo[] = [];
  for (let i = 1; i <= 20; i++) {
    // Create empty racks with no servers
    const servers: ServerInfo[] = [];
    mockRacks.push({...});
  }
  ```

### 2. Create useRoomData Hook (Similar to useRackData)
- **Purpose:** Fetch all racks and their servers for a selected room
- **Parameters:** Room filters (site, building, floor, room)
- **Returns:** `{ racksData, loading, error, refetch }`
- **Backend Integration:** Use existing Edge Functions or create new ones

### 3. Implement Real Data Rendering
- **Rack Data:** Fetch actual racks from database with real server positions
- **Server Visualization:** Show actual servers in their correct rack positions
- **Statistics:** Display real utilization percentages, server counts, status data

### 4. Backend Edge Functions Needed
- **Existing:** `get-hierarchy-data` (already implemented, works correctly)
- **Missing:** `get-room-data` or similar to fetch all racks/servers for a room
- **Alternative:** Use `get-rack-data` multiple times for each rack in the room

### 5. Data Mapping & Structure Alignment
- **RoomView Interface:** Update `RackInfo` and `ServerInfo` interfaces to match backend data
- **Position Handling:** Ensure server positions match between RoomView and RackView
- **Status Colors:** Use same status mapping as RackView for consistency

---
## Backend & Hooks: Before and After

### Current RoomView.tsx (INCORRECT - Uses Mock Data)
```tsx
// Lines 101-120: Mock data generation in useEffect
useEffect(() => {
  if (filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room) {
    const mockRacks: RackInfo[] = [];
    for (let i = 1; i <= 20; i++) {
      // Create empty racks with no servers
      const servers: ServerInfo[] = [];
      mockRacks.push({
        id: `RACK-${i.toString().padStart(2, '0')}`,
        name: `RACK-${i.toString().padStart(2, '0')}`,
        // ... more hardcoded data
        servers: servers // Empty array
      });
    }
    setRacksData(mockRacks);
  }
}, [filters.dc_site, filters.dc_building, filters.dc_floor, filters.dc_room]);
```

### Target RoomView.tsx (CORRECT - Like RackView.tsx)
```tsx
// Use real data hooks like RackView.tsx
const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
const { racksData, loading, error } = useRoomData(filters); // New hook needed

// Remove mock data generation completely
// Data comes from backend automatically when filters change
```

### RackView.tsx (CORRECT - Reference Implementation)
```tsx
// Uses real backend data
const { rackData, loading, error } = useRackData(currentRack);
// Displays actual servers from database with real positions, specs, status
```

---
## Before/After Code Example

### Before (Mock Data)
```tsx
// RoomView.tsx
const racks = [
  { name: 'RACK-01', servers: [...] },
  { name: 'RACK-02', servers: [...] },
];
// ...render racks and servers from local arrays
```

### After (Dynamic Data)
```tsx
// RoomView.tsx
const { hierarchyData, filters, updateFilter } = useHierarchicalFilter();
const { racksData, loading, error } = useRoomData(filters);
useEffect(() => {
  // Fetch racks/servers when filters change
}, [filters]);
// ...render racks and servers from racksData
```

---
## Backend Edge Functions Used
- `get-hierarchy-data`: Returns available filter options for site, building, floor, room, rack.
- `get-room-data`: Returns all racks and servers for a given room (should be implemented if not present).

---
## Hooks Context Used
- `useHierarchicalFilter`: Provides `hierarchyData`, `filters`, `updateFilter`, and handles hierarchical filtering logic.
- `useRoomData`: Fetches racks and servers for the selected room and filters.

---
## Integration Checklist

### Step 1: Remove Mock Data (CRITICAL)
- [ ] **Delete lines 101-120**: Remove mock data generation useEffect in RoomView.tsx
- [ ] **Remove setRacksData(mockRacks)**: Delete mock data state setting
- [ ] **Update imports**: Remove any unused mock data related imports

**Before (Lines 95-125 in RoomView.tsx):**
```tsx
  const [racksData, setRacksData] = useState<RackInfo[]>([]);
  const [selectedRack, setSelectedRack] = useState<string | null>(null);

  // Mock data generation - TO BE REMOVED
  useEffect(() => {
    if (filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room) {
      const mockRacks: RackInfo[] = [];
      for (let i = 1; i <= 20; i++) {
        // Create empty racks with no servers
        const servers: ServerInfo[] = [];
        mockRacks.push({
          id: `RACK-${i.toString().padStart(2, '0')}`,
          name: `RACK-${i.toString().padStart(2, '0')}`,
          position: { x: (i - 1) % 5, y: Math.floor((i - 1) / 5) },
          dimensions: { width: 1, height: 1 },
          capacity: 42,
          utilization: Math.random() * 100,
          status: 'active',
          servers: servers
        });
      }
      setRacksData(mockRacks);
    }
  }, [filters.dc_site, filters.dc_building, filters.dc_floor, filters.dc_room]);

  const handleRackClick = (rackId: string) => {
```

**After (Lines 95-105 in RoomView.tsx):**
```tsx
  // Remove useState for racksData - will come from hook
  const [selectedRack, setSelectedRack] = useState<string | null>(null);

  // Real data from backend hook (to be implemented)
  const { racksData, loading, error } = useRoomData(filters);

  const handleRackClick = (rackId: string) => {
```

### Step 2: Backend Functions 
- [ ] Verify `get-hierarchy-data` includes room filtering support
- [ ] Create `get-room-data` Edge Function (copy from `get-rack-data` pattern)
- [ ] Test room data endpoint with hierarchical filtering

**Create new Edge Function: `volumes/functions/get-room-data/index.ts`**
```tsx
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { site, building, floor, room } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch all racks for the specified room
    const { data: racks, error: racksError } = await supabase
      .from('assets')
      .select(`
        *,
        servers:assets!parent_id(*)
      `)
      .eq('dc_site', site)
      .eq('dc_building', building)
      .eq('dc_floor', floor)
      .eq('dc_room', room)
      .eq('asset_type', 'rack')
      .order('asset_name');

    if (racksError) throw racksError;

    // Transform data to match RoomView.tsx expected format
    const transformedRacks = racks?.map(rack => ({
      id: rack.asset_id,
      name: rack.asset_name,
      position: { x: rack.rack_x || 0, y: rack.rack_y || 0 },
      dimensions: { width: 1, height: 1 },
      capacity: rack.rack_capacity || 42,
      utilization: calculateUtilization(rack.servers),
      status: rack.asset_status || 'active',
      servers: rack.servers?.map(server => ({
        id: server.asset_id,
        name: server.asset_name,
        rackPosition: server.rack_position || 1,
        height: server.rack_height || 1,
        status: server.asset_status || 'active',
        specifications: {
          cpu: server.cpu_model,
          memory: server.memory_total,
          storage: server.storage_total
        }
      })) || []
    })) || [];

    return new Response(
      JSON.stringify({ racks: transformedRacks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateUtilization(servers: any[]): number {
  // Calculate rack utilization based on server rack heights
  const totalUsedU = servers?.reduce((sum, server) => sum + (server.rack_height || 1), 0) || 0;
  return Math.min((totalUsedU / 42) * 100, 100); // Assuming 42U racks
}
```

### Step 3: Create useRoomData Hook
- [ ] Copy `useRackData` hook structure from `src/hooks/`
- [ ] Modify to return room-level data: `{ racksData, loading, error }`
- [ ] Integrate with Supabase `get-room-data` function
- [ ] Handle filter-based data fetching

**Create new file: `src/hooks/useRoomData.ts`**
```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRoomDataResult {
  racksData: RackInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useRoomData = (filters: FilterState): UseRoomDataResult => {
  const [racksData, setRacksData] = useState<RackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = async () => {
    if (!filters.dc_site || !filters.dc_building || !filters.dc_floor || !filters.dc_room) {
      setRacksData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('get-room-data', {
        body: { 
          site: filters.dc_site,
          building: filters.dc_building,
          floor: filters.dc_floor,
          room: filters.dc_room
        }
      });

      if (supabaseError) throw supabaseError;
      setRacksData(data?.racks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room data');
      setRacksData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [filters.dc_site, filters.dc_building, filters.dc_floor, filters.dc_room]);

  return { racksData, loading, error, refetch: fetchRoomData };
};
```

### Step 4: Component Integration
- [ ] Replace useState with useRoomData hook:
  ```tsx
  // Remove: const [racksData, setRacksData] = useState<RackInfo[]>([]);
  // Add: const { racksData, loading, error } = useRoomData(filters);
  ```
- [ ] Add loading and error handling like RackView.tsx
- [ ] Update rack rendering to use real backend data
- [ ] Remove all hardcoded mock values

**Before (RoomView.tsx imports):**
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHierarchicalFilter } from '@/hooks/useHierarchicalFilter';
```

**After (RoomView.tsx imports):**
```tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHierarchicalFilter } from '@/hooks/useHierarchicalFilter';
import { useRoomData } from '@/hooks/useRoomData';
import { Loader2, AlertCircle } from 'lucide-react';
```

**Before (Component state and data):**
```tsx
export function RoomView() {
  const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
  const [racksData, setRacksData] = useState<RackInfo[]>([]);
  const [selectedRack, setSelectedRack] = useState<string | null>(null);

  // Mock data generation useEffect here...
```

**After (Component state and data):**
```tsx
export function RoomView() {
  const { hierarchyData, filters, updateFilter, resetFilters } = useHierarchicalFilter();
  const { racksData, loading, error } = useRoomData(filters);
  const [selectedRack, setSelectedRack] = useState<string | null>(null);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading room data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">Error loading room data: {error}</span>
      </div>
    );
  }
```

### Step 5: Testing & Validation
- [ ] Test hierarchical filtering: site → building → floor → room
- [ ] Verify real rack and server data displays correctly  
- [ ] Test navigation between RoomView and RackView
- [ ] Validate data consistency with RackView.tsx patterns

---

## ✅ IMPLEMENTATION COMPLETED

### ✅ Files Created/Modified:
1. **`src/hooks/useRoomData.ts`** - New hook for fetching room data
2. **`volumes/functions/get-room-data/index.ts`** - New Edge Function for room data
3. **`volumes/functions/get-room-data/deno.json`** - Deno configuration
4. **`volumes/functions/main/index.ts`** - Added get-room-data endpoint routing
5. **`src/components/RoomView.tsx`** - Updated to use real backend data

### ✅ Changes Implemented:
- ❌ **Removed**: Mock data generation (lines 101-120)
- ❌ **Removed**: `useEffect` for mock data 
- ❌ **Removed**: `setRacksData` state setter
- ✅ **Added**: `useRoomData` hook integration
- ✅ **Added**: Loading and error states 
- ✅ **Added**: Real backend data fetching
- ✅ **Added**: Proper TypeScript interfaces

### ✅ Backend Integration:
- **Edge Function**: `get-room-data` created following `get-rack-data` pattern
- **Database Query**: Fetches racks and servers for specified room
- **Data Transformation**: Matches RoomView.tsx expected format
- **Error Handling**: Proper CORS and error responses

### 🧪 Next Steps for Testing:
1. **Deploy Edge Function**: Deploy `get-room-data` to Supabase
2. **Test API**: Verify edge function responds correctly
3. **Test UI**: Check loading states and real data display
4. **Validate Navigation**: Ensure room-to-rack navigation works

---

