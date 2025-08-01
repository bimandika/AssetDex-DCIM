# Plan: Remove Hardcoded Filters and Implement Dynamic RackView Filter (rackview-filter) - UPDATED

## Current Status: Implementation Complete! ✅

After executing the plan, the following fixes have been implemented:

### ✅ Issues That Have Been Fixed:

1. **✅ FIXED: get-rack-location/index.ts** - Now queries `rack_metadata` table instead of hardcoded values
   - **Before**: Hardcoded locations missing RACK-04
   - **After**: Dynamic database query that includes all racks including RACK-04

2. **✅ FIXED: get-default-rack/index.ts** - Now queries database for first available rack
   - **Before**: Hardcoded return of 'RACK-01'
   - **After**: Dynamic query with fallback to 'RACK-01' if database fails

3. **✅ FIXED: RackView.tsx hardcoded rackMap** - Removed hardcoded mapping completely
   - **Before**: Used hardcoded ID-to-name mapping
   - **After**: Uses only dynamic data from `hierarchyData`

4. **✅ ADDED: Database functions** - Enhanced with proper database functions
   - Added `get_default_rack()` function
   - Added `get_rack_location()` function  
   - Added `get_all_racks()` function for future use

### ✅ Issues That Were Previously Fixed:
- **RACK-04 location added to useHierarchicalFilter.ts** - This was updated to include RACK-04's location in the fallback
- **Data transformation in useRoomData.ts** - Fixed to properly map database fields to UI expectations

## Goal
Make all RackView filters (hierarchical and direct rack selection) fully dynamic and data-driven, so users can filter racks by site/building/floor/room or directly select a rack, with both filter systems working together.

## Expected Behavior if Successful
- All filter dropdowns (site, building, floor, room, rack) show only valid, up-to-date options from the backend.
- User can use hierarchical filters (site → building → floor → room) to narrow down racks.
- User can also directly select a rack from the rack dropdown.
- If the user chooses a rack directly, the hierarchical filters (site, building, floor, room) automatically update to match the selected rack's location.
- No hardcoded filter values or mappings anywhere—everything is dynamic.

## User Stories
- As a user, I want to filter racks by site, building, floor, and room so I can find racks in a specific location.
- As a user, I want to directly select a rack from a dropdown, regardless of the current hierarchical filter state.
- As a user, when I select a rack directly, I want the site/building/floor/room filters to automatically update to show the location of that rack.
- As a user, I want all filter options to always be accurate and up-to-date, with no hardcoded or outdated values.

## Filter Usage
- You can use hierarchical filters to narrow down racks.
- You can use the rack dropdown to jump directly to a rack.
- If you choose a rack, the hierarchical filters will follow and update to match that rack's location.

## Scope
This plan covers all filtering logic in RackView, including hierarchical and direct rack selection ("rackview-filter").

## Immediate Action Items to Fix Current Issues

### 1. Fix Edge Functions (Backend)

#### A. Update get-default-rack/index.ts
Replace hardcoded default with database query:
```typescript
// Instead of: const firstRack = 'RACK-01'
// Query the database:
const { data: firstRack, error } = await supabaseClient
  .from('rack_metadata')
  .select('rack_name')
  .order('rack_name')
  .limit(1)
  .single();

return new Response(
  JSON.stringify({ defaultRack: firstRack?.rack_name || 'RACK-01' }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
);
```

#### B. Update get-rack-location/index.ts
Replace hardcoded locations with database query:
```typescript
// Instead of hardcoded rackLocations object
// Query the database:
const { data: rackLocation, error } = await supabaseClient
  .from('rack_metadata')
  .select('dc_site, dc_building, dc_floor, dc_room')
  .eq('rack_name', rackName)
  .single();

if (error || !rackLocation) {
  throw new Error(`Rack ${rackName} not found`);
}

return new Response(
  JSON.stringify({ location: rackLocation }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
);
```

### 2. Fix Frontend (RackView.tsx)

#### Remove Hardcoded rackMap
```tsx
// DELETE this entire object:
const rackMap: Record<string, string> = {
  "1": "RACK-01",
  "2": "RACK-02", 
  "3": "RACK-03",
  "4": "RACK-04"
};

// UPDATE the currentRack logic to use only dynamic data:
const currentRack = filters.rack 
  ? filters.rack
  : selectedRack 
  || (hierarchyData.racks.length > 0 && filters.dc_site && filters.dc_building && filters.dc_floor && filters.dc_room 
     ? hierarchyData.racks[0] 
     : defaultRack || hierarchyData.allRacks?.[0] || "RACK-01");
```

## What Will Change

### 0. Backend Readiness & Direct Rack Selection
- **CRITICAL**: The backend functions `get-default-rack` and `get-rack-location` currently use hardcoded values and are missing RACK-04.
- These functions must be refactored to query the `rack_metadata` table instead of using static mappings.
- The frontend should use only dynamic endpoints for all filter dropdowns and rack selection logic.

### 1. Remove Hardcoded rackMap
- **Delete** the `rackMap` object completely.
- **Update** rack selection logic to use only dynamic data from `hierarchyData.racks` and `hierarchyData.allRacks`.

### 2. Use Dynamic Filter Options
- All filter dropdowns already use dynamic arrays from `hierarchyData`, which is good.
- Ensure fallback logic also uses dynamic data rather than hardcoded values.

### 3. Dynamic Rack Selection
- **Update** rack selection to use filtered list from `hierarchyData.racks`.
- **Remove** dependency on hardcoded rack ID to name mappings.

### 4. Filter Logic
- **Reset** lower-level filters when a higher-level filter changes.
- **Use** `updateFilter` and `resetFilters` from the hook.

### 5. Testing Requirements
- **Verify** all filter dropdowns populate and update correctly.
- **Test** that RACK-04 appears in all relevant dropdowns and can be selected.
- **Ensure** rack view updates based on selected filters.
- **Test** direct rack selection updates hierarchical filters correctly.

## Database Function Analysis

After reviewing `consolidated-migration.sql`, here are the findings related to filtering and hierarchy functions:

### ✅ Existing Database Functions:
- **Filter preference functions**: `get_user_filter_preferences()`, `update_user_filter_preference()`, etc.
- **Enum handling functions**: `get_enum_values()`, `get_table_schema()`, etc.
- **General utility functions**: Various helper functions for property management

### ❌ Missing Database Functions for Hierarchy/Rack Operations:
The database **does not have** specific stored procedures for:
1. `get_hierarchy_data()` - This is handled by the Edge Function directly querying `servers` table
2. `get_default_rack()` - No database function, Edge Function uses hardcoded value
3. `get_rack_location()` - No database function, Edge Function uses hardcoded mapping

### 🔍 Current Edge Function Behavior:
- **get-hierarchy-data**: ✅ Dynamically queries `servers` table (GOOD)
- **get-default-rack**: ❌ Returns hardcoded `'RACK-01'` (BAD)
- **get-rack-location**: ❌ Uses hardcoded location mappings missing RACK-04 (CRITICAL)

### 📋 Recommended Database Functions to Add:

#### 1. Add get_default_rack() Database Function
```sql
-- Function to get the first available rack from rack_metadata
CREATE OR REPLACE FUNCTION public.get_default_rack()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_rack TEXT;
BEGIN
    SELECT rack_name INTO default_rack
    FROM public.rack_metadata
    ORDER BY rack_name
    LIMIT 1;
    
    RETURN COALESCE(default_rack, 'RACK-01');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_default_rack() TO authenticated;
```

#### 2. Add get_rack_location() Database Function
```sql
-- Function to get rack location from rack_metadata
CREATE OR REPLACE FUNCTION public.get_rack_location(p_rack_name TEXT)
RETURNS TABLE(
    dc_site public.site_type,
    dc_building public.building_type,
    dc_floor public.floor_type,
    dc_room public.room_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.dc_site,
        rm.dc_building,
        rm.dc_floor,
        rm.dc_room
    FROM public.rack_metadata rm
    WHERE rm.rack_name = p_rack_name;
    
    -- If no result found, raise exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rack % not found in rack_metadata table', p_rack_name;
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_rack_location(TEXT) TO authenticated;
```

#### 3. Add get_all_racks() Database Function (Optional Enhancement)
```sql
-- Function to get all available racks
CREATE OR REPLACE FUNCTION public.get_all_racks()
RETURNS TABLE(
    rack_name public.rack_type,
    dc_site public.site_type,
    dc_building public.building_type,
    dc_floor public.floor_type,
    dc_room public.room_type,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.rack_name,
        rm.dc_site,
        rm.dc_building,
        rm.dc_floor,
        rm.dc_room,
        rm.description
    FROM public.rack_metadata rm
    ORDER BY rm.rack_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_racks() TO authenticated;
```

### 🚀 Implementation Priority:

1. **Immediate Fix (Critical)**: Update Edge Functions to use direct database queries instead of hardcoded values
2. **Medium Priority**: Add the database functions above for better performance and consistency
3. **Future Enhancement**: Consider caching strategies for frequently accessed hierarchy data

## Priority Order for Implementation

1. **High Priority**: Fix `get-rack-location/index.ts` to include RACK-04 and use database queries
2. **High Priority**: Fix `get-default-rack/index.ts` to use database queries
3. **Medium Priority**: Remove hardcoded rackMap from RackView.tsx
4. **Low Priority**: Clean up any remaining hardcoded fallbacks

## Example of New Dynamic Code

### Updated get-rack-location/index.ts:
```typescript
export const handler = async (req: Request): Promise<Response> => {
  // ... setup code ...
  
  const { rackName } = await req.json();
  
  if (!rackName) {
    throw new Error('rackName is required');
  }

  // Query database instead of hardcoded values
  const { data: rackLocation, error } = await supabaseClient
    .from('rack_metadata')
    .select('dc_site, dc_building, dc_floor, dc_room')
    .eq('rack_name', rackName)
    .single();

  if (error || !rackLocation) {
    throw new Error(`Rack ${rackName} not found in database`);
  }

  return new Response(
    JSON.stringify({ location: rackLocation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
};
```

### Updated RackView.tsx rack selection:
```tsx
// Remove hardcoded rackMap entirely

// Use only dynamic data for rack selection
const currentRack = filters.rack 
  ? filters.rack
  : selectedRack 
  || (hierarchyData.racks.length > 0 ? hierarchyData.racks[0] : defaultRack);
```

## Testing Checklist
- [ ] RACK-04 appears in all filter dropdowns
- [ ] Direct rack selection works for all racks including RACK-04
- [ ] Hierarchical filtering works correctly
- [ ] No console errors about missing rack mappings
- [ ] All edge functions return dynamic data
- [ ] Fallback behavior works when no racks are available
