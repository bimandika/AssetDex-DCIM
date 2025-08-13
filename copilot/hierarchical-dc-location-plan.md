# Plan: Hierarchical DC Location Selection in ServerInventory Dialog

## Goal
Refactor the DC Site, DC Building, DC Floor, and DC Room fields in the ServerInventory add/edit dialog to use hierarchical dropdowns, similar to RoomView, for improved UX and data integrity.

## Motivation
- Current UI uses flat dropdowns for DC location fields, which can lead to invalid combinations and poor usability.
- Hierarchical selection ensures only valid combinations are selectable, matching the actual data center structure.
- Consistency with RoomView and other widgets that use hierarchical filters.

## Implementation Steps

### 1. Analyze Existing Hierarchical Filter
- Review `useHierarchicalFilter` hook (already used in RoomView) for API and state management.
- Confirm it provides: `hierarchyData`, `filters`, `updateFilter`, and disables child dropdowns until parent is selected.

### 2. Integrate Hook in ServerInventory
- Import and initialize `useHierarchicalFilter` in ServerInventory dialog scope.
- Sync form values with hierarchical filter state for DC Site, Building, Floor, Room.

### 3. Refactor Dialog UI
- Replace current flat Selects for DC Site, Building, Floor, Room with hierarchical Selects:
  - DC Site: enabled always, options from `hierarchyData.sites`.
  - DC Building: enabled if DC Site selected, options from `hierarchyData.buildings`.
  - DC Floor: enabled if DC Building selected, options from `hierarchyData.floors`.
  - DC Room: enabled if DC Floor selected, options from `hierarchyData.rooms`.
- On change, use `updateFilter` to update hierarchy and reset child fields.
- Sync form values with hierarchical filter state (on selection, update form field and hierarchical filter).

### 4. Data Submission
- Ensure form submission uses the selected hierarchical values for DC Site, Building, Floor, Room.
- Validate that only valid combinations are submitted.

### 5. Edge Cases & UX
- Handle editing: pre-populate hierarchical filter state from editingServer values.
- Handle reset: reset all location fields and hierarchical filter state.
- Show loading state if hierarchy data is loading.

### 6. Testing
- Test add/edit flows for valid/invalid combinations.
- Test integration with backend (position history, server update).
- Test fallback and error states.

## Deliverables
- Patch to ServerInventory.tsx implementing hierarchical DC location selection.
- Consistent UX with RoomView and metrics widget.
- Documentation in this plan file.

---

**Author:** GitHub Copilot
**Date:** 2025-08-13

---

## Code Changes: Hierarchical DC Location Selection in ServerInventory Dialog

### Description
The following code changes should be made in `src/components/ServerInventory.tsx`:

- **Import and hook initialization:**
  - Add the import for `useHierarchicalFilter` near the top of the file (with other imports).
  - Initialize the hook inside the `ServerInventory` component, after other hooks.

- **Sync form and hierarchical filter:**
  - Add the `useEffect` to sync hierarchical filter state with the form when `editingServer` changes. Place this after other `useEffect` hooks that handle form state (recommended: after the effect that resets the form when editingServer changes).

- **Dialog UI changes:**
  - Replace the existing DC Site, DC Building, DC Floor, and DC Room dropdowns in the add/edit dialog (inside the form, typically around lines 1320–1380) with the hierarchical dropdown code provided. This is in the section rendering the form fields for server location.

- **Loading state:**
  - Optionally, show a loading spinner or disable dropdowns if `locationLoading` is true.

### Line Numbers
- **Import:** Near the top, with other imports (lines 1–40).
- **Hook initialization:** Inside `ServerInventory` function, after other hooks (lines 50–100).
- **Sync effect:** After other form-related effects (lines 200–300).
- **Dialog UI:** Replace the DC location dropdowns in the form section (lines 1320–1380).

### Example Placement
```tsx
// src/components/ServerInventory.tsx
// ...existing imports...
import { useHierarchicalFilter } from "@/hooks/useHierarchicalFilter";
// ...existing code...
const ServerInventory = () => {
  // ...existing hooks...
  const {
    hierarchyData,
    filters: locationFilters,
    updateFilter: updateLocationFilter,
    resetFilters: resetLocationFilters,
    loading: locationLoading,
  } = useHierarchicalFilter();
  // ...existing code...

  useEffect(() => {
    if (editingServer) {
      updateLocationFilter('dc_site', editingServer.dc_site || '');
      updateLocationFilter('dc_building', editingServer.dc_building || '');
      updateLocationFilter('dc_floor', editingServer.dc_floor || '');
      updateLocationFilter('dc_room', editingServer.dc_room || '');
    } else {
      resetLocationFilters();
    }
  }, [editingServer]);

  // ...existing code...
  // In the dialog form section (lines 1320–1380):
  // Replace DC Site, DC Building, DC Floor, DC Room dropdowns with hierarchical dropdowns
```

---

**See the plan above for context and rationale.**
