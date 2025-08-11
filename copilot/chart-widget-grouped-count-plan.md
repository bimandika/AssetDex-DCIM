# Chart Widget Edit: Grouped Count Query Plan

## Goal
Enable users to configure a chart widget that performs any grouped count query (e.g., count servers by any field, filtered by any field) using a form with fully dynamic dropdowns for all relevant fields.

## Current State
The chart widget edit dialog allows selection of breakdown fields (groupBy), aggregation, and filters using dropdowns.
The backend and database support queries like:
```sql
SELECT dc_site, COUNT(*) AS server_count
FROM public.servers
WHERE model = 'PowerEdge R750'
  AND status = 'Active'
GROUP BY dc_site;

SELECT model, COUNT(*) AS ready_count
FROM public.servers
WHERE status = 'Ready' AND dc_site = 'DC-East'
GROUP BY model;

SELECT allocation, COUNT(*) AS server_count
FROM public.servers
WHERE status = 'Active'
GROUP BY allocation;
```
The frontend saves `groupBy` as an array, and the backend enforces this for consistency.

## Plan
1. **Form UI Enhancements**
   - Add dropdowns for:
     - Table selection (e.g., servers, racks, rooms, etc.)
     - Aggregation type (count, sum, avg, etc.)
     - Group By field(s): multi-select dropdown, supports any field in the table. Common options include:
       - dc_site
       - status
       - allocation
       - environment
       - model
       - ...any other field in the table
     - Filter fields: multi-select with value input, supports any field and value. Common options include:
       - status
       - dc_site
       - allocation
       - environment
       - model
       - ...any other field in the table
   - All these fields are available as dropdowns in the chart widget edit form and can be freely selected for groupBy and filters.
   - Allow users to select multiple groupBy fields and multiple filters for maximum flexibility.
   - Show a preview of the resulting query (optional, for advanced users).

2. **Frontend Logic**
   - On form submit, build a config object:
     - `data_source: { table, aggregation, groupBy: [...], filters: [...] }`
   - Populate all dropdowns dynamically from schema/metadata (field lists for selected table).
   - Allow users to add/remove groupBy and filter fields freely.
   - Validate required fields before saving.

3. **Backend Handling**
   - Accept widget config with groupBy as array, filters as array of objects.
   - When rendering chart data, build SQL query based on config:
     - Use selected table, aggregation, groupBy, and filters.
     - Support any combination of groupBy and filters for dynamic queries.
   - Return grouped/aggregated data for chart rendering.

4. **Example User Flows**
   - Count servers by environment, filtered by status:
     - groupBy: environment
     - filters: status = 'Active'
   - Count servers by DC site, filtered by model/status:
     - groupBy: dc_site
     - filters: model = 'PowerEdge R750', status = 'Active'
   - Count servers by model, filtered by status and site:
     - groupBy: model
     - filters: status = 'Ready', dc_site = 'DC-East'
   - Count servers by allocation type, filtered by status:
     - groupBy: allocation
     - filters: status = 'Active'
   - Count servers by status and model, filtered by site:
     - groupBy: status, model
     - filters: dc_site = 'DC-West'

5. **Future Enhancements**
   - Support for advanced filters (AND/OR logic, ranges, etc.).
   - Query preview and validation.
   - Dynamic field lists based on selected table.
   - Support for custom SQL (advanced users).

## Implementation Notes
-
## Before and After: Code Example

### Before
Hardcoded dropdowns for groupBy and limited filter support:
```tsx
// ChartWidgetEditDialog.tsx (before)
<Select
  value={formData.data_source.groupBy[0]}
  onValueChange={value => updateDataSource('groupBy', [value])}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="brand">Brand</SelectItem>
    <SelectItem value="model">Model</SelectItem>
    <SelectItem value="status">Status</SelectItem>
  </SelectContent>
</Select>
```

### After
Dynamic dropdowns for all table fields, supporting multi-select for groupBy and dynamic filters:
```tsx
// ChartWidgetEditDialog.tsx (after)
import { getTableFields } from '@/utils/schemaMeta';

const tableFields = getTableFields(formData.data_source.table); // e.g., ['dc_site', 'status', 'allocation', 'environment', 'model', ...]

<Select
  multiple
  value={formData.data_source.groupBy}
  onValueChange={values => updateDataSource('groupBy', values)}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {tableFields.map(field => (
      <SelectItem key={field} value={field}>{field}</SelectItem>
    ))}
  </SelectContent>
</Select>

// Filters section (dynamic)
{tableFields.map(field => (
  <FilterDropdown
    key={field}
    field={field}
    value={formData.data_source.filters[field]}
    onChange={value => updateFilter(field, value)}
  />
))}
```

### Supporting Files
- `src/utils/schemaMeta.ts`: Utility to fetch available fields for a table (static or backend-driven).
- `src/components/dashboard/FilterDropdown.tsx`: Reusable dropdown/input for filter selection.
- Update `ChartWidgetEditDialog.tsx` to use these utilities/components.
- All dropdowns should be populated from schema metadata for full flexibility.
- The backend should always treat groupBy as an array for consistency.
- Filters should be flexible, supporting multiple conditions and any field/value.

---
This plan enables users to build any grouped count query for chart widgets using a form-based UI with fully dynamic dropdowns, matching the full SQL capabilities of the backend and schema.
