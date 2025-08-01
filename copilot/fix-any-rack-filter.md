# Fix Plan: "Any Rack" Filter Shows Only 3 Racks

## Problem Analysis

The "Any Rack" filter in RackView only shows 3 racks instead of all 38 available racks. Investigation reveals:

1. **get-enums Edge Function works correctly** - Returns 38 racks when called via curl
2. **Frontend fallback logic is triggered** - Instead of using the actual API data
3. **Hardcoded fallback arrays** - Multiple locations with `['RACK-01', 'RACK-02', 'RACK-03']`

## Root Cause

The `getAllRacks()` function in `useHierarchicalFilter.ts` is falling back to hardcoded arrays instead of successfully calling the get-enums endpoint. This could be due to:

- Authentication issues with `supabase.functions.invoke('get-enums')`
- Network connectivity problems from frontend to Edge Function
- Error handling catching legitimate responses as errors

## Solution Plan

### Step 1: Debug the getAllRacks Function
- Add detailed logging to see exactly what error is occurring
- Check if the supabase.functions.invoke is using the correct authentication
- Verify the response format matches expectations

### Step 2: Fix Authentication Issues
- Ensure get-enums Edge Function config allows unauthenticated access if needed
- Or ensure proper authentication token is passed in the frontend call
- Compare with working Edge Function calls (like get-default-rack)

### Step 3: Update Fallback Logic
- Remove hardcoded fallback arrays from multiple locations
- Implement better error handling with retry mechanisms
- Use a more comprehensive fallback if Edge Function truly fails

### Step 4: Alternative Implementation
- If supabase.functions.invoke continues to fail, implement direct fetch() call
- Use the same pattern as EnumContext.tsx which uses direct HTTP calls
- Ensure consistent API calling patterns across the application

## Files to Modify

1. **src/hooks/useHierarchicalFilter.ts**
   - Fix getAllRacks() function
   - Remove hardcoded fallback arrays
   - Add better error logging and handling

2. **volumes/functions/get-enums/config.toml** (if needed)
   - Adjust authentication requirements
   - Ensure CORS is properly configured

## Testing Strategy

1. **Verify Edge Function accessibility**
   - Test direct curl calls with and without auth headers
   - Confirm response format matches frontend expectations

2. **Test frontend integration**
   - Add console logging to track API call flow
   - Verify "Any Rack" dropdown populates with all 38 racks
   - Test both authenticated and unauthenticated scenarios

3. **Fallback testing**
   - Temporarily disable Edge Function to test fallback behavior
   - Ensure graceful degradation without breaking UI

## Expected Outcome

After implementation:
- "Any Rack" filter will show all 38 available racks
- Consistent API calling patterns across the application
- Robust error handling with proper fallbacks
- Improved debugging capabilities for future issues

## Priority: High
This affects core navigation functionality and user experience in the RackView component.
