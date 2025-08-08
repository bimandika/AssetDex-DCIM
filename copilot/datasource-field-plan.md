## Audit: ChartWidget Filter Support

- ChartWidget (EnhancedChartWidget) does not render filter controls in the UI.
- Filters set in WidgetEditDialog (merged into data_source.filters) are sent to the backend and applied to chart data.
- Users cannot interactively change filters in ChartWidget; only filters set during widget creation/editing are used.
- To support interactive filtering, add filter UI to ChartWidget and merge user-selected filters into the data source config before fetching data.

**Action:**  
- If interactive filter support is needed, update ChartWidget to render filter controls and merge them into the query config.
- Current design supports static filters set in WidgetEditDialog.
## Widget Data Source Field Support: Implementation Plan & Code Example

### 1. Overview
This plan documents how the data source field in `WidgetEditDialog` works, what each option means, and provides a code excerpt for the UI logic. It is intended for developers and maintainers to understand and extend widget data source support.


### 2. Data Source Field Options (Charts)
- **Table**: (Removed for charts) — All chart widgets will use the `servers` table only.
- **Field**: The column to aggregate or group by. Required for sum, avg, min, max aggregations.
- **Aggregation**: How to summarize the data. Options:
  - `count`: Number of records (ignores field)
  - `sum`: Total value of selected field
  - `avg`: Mean value of selected field
  - `min`: Smallest value in field
  - `max`: Largest value in field


### 3. UI Code Example (React/TypeScript)
```tsx

{/* For chart widgets, the table is always 'servers' */}
<div className="space-y-2">
  <Label htmlFor="field">Column</Label>
  <Select
    value={formData.data_source.field || ''}
    onValueChange={(value: string) => updateDataSource('field', value)}
    disabled={numericAggregations.includes(formData.data_source.aggregation) && !numericFields.includes(formData.data_source.field)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select a field" />
    </SelectTrigger>
    <SelectContent>
      {(formData.data_source.aggregation && numericAggregations.includes(formData.data_source.aggregation)
        ? numericFields
        : allFields
      ).map((field) => (
        <SelectItem key={field} value={field}>
          {field === 'status' ? 'Status — Server status (Active, Ready, etc.)'
            : field === 'type' ? 'Type — Device type (Server, Storage, Network, etc.)'
            : field === 'location' ? 'Location — Data center site/building/floor/room'
            : field === 'model' ? 'Model — Hardware model'
            : field === 'brand' ? 'Brand — Vendor/brand'
            : field === 'floor' ? 'Floor — Room floor number'
            : field === 'region' ? 'Region — Data center site'
            : field }
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label htmlFor="aggregation">Aggregation</Label>
  {/* Aggregation: How to summarize the data. */}
  <Select
    value={formData.data_source.aggregation || 'count'}
    onValueChange={(value: string) => updateDataSource('aggregation', value)}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="count">Count — Number of records (ignores field)</SelectItem>
      <SelectItem value="sum">Sum — Total value of selected field (numeric only)</SelectItem>
      <SelectItem value="avg">Average — Mean value of selected field (numeric only)</SelectItem>
      <SelectItem value="min">Minimum — Smallest value in field (numeric only)</SelectItem>
      <SelectItem value="max">Maximum — Largest value in field (numeric only)</SelectItem>
    </SelectContent>
  </Select>
</div>

// Helper arrays for validation
const allFields = ['status', 'type', 'location', 'model', 'brand', 'floor', 'region'];
const numericFields = ['floor']; // Extend with other numeric columns as needed

# DCIM Chart & Data Source Integration Plan

## 1. Chart Types for DCIM
- Stacked Bar Chart: Status/capacity by location, floor, or rack
- Heatmap: Utilization (temperature, power, occupancy) by rack/room
- TreeMap/Sunburst: Hierarchical capacity (site > building > floor > room > rack)
- Timeline/Swimlane: Event history (maintenance, outages, deployments)
- Gauge/Donut: Overall metrics (capacity, % used)

## 2. Data Flow & Backend
- Widget config includes: table, aggregation, filters (hierarchical flexible)
- Backend maps plural/singular hierarchical fields (dc_sites, dc_buildings, etc.)
- Only valid fields sent from frontend
- Backend supports count, sum, avg, min, max aggregations

## 3. Frontend Integration
- Use React chart library (Nivo, Recharts, Chart.js)
- Tailwind for layout, controls, legends
- WidgetEditDialog: User selects chart type, data source, filters
- ServerFilterComponent: Flexible hierarchical filter selection
- ChartWidget/EnhancedChartWidget: Renders chart based on config

## 4. Example Widget Config
```json
{
  "widget_type": "chart",
  "data_source": {
    "table": "servers",
    "aggregation": "count",
    "filters": [
      {"field": "dc_sites", "value": ["SiteA"], "operator": "equals"},
      {"field": "dc_buildings", "value": ["Building1"], "operator": "equals"}
    ]
  }
}
```

## 5. Integration Steps
1. Update frontend to allow flexible hierarchical filter selection
2. Ensure only valid fields sent to backend
3. Backend maps fields and applies filters
4. ChartWidget renders chart using selected type and data
5. Document supported chart types and config in this file

## 6. UI Code Example (React/TypeScript)
```tsx
{/* For chart widgets, the table is always 'servers' */}
<div className="space-y-2">
  <Label htmlFor="field">Column</Label>
  <Select
    value={formData.data_source.field || ''}
    onValueChange={(value: string) => updateDataSource('field', value)}
    disabled={numericAggregations.includes(formData.data_source.aggregation) && !numericFields.includes(formData.data_source.field)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select a field" />
    </SelectTrigger>
    <SelectContent>
      {(formData.data_source.aggregation && numericAggregations.includes(formData.data_source.aggregation)
        ? numericFields
        : allFields
      ).map((field) => (
        <SelectItem key={field} value={field}>
          {field === 'status' ? 'Status — Server status (Active, Ready, etc.)'
            : field === 'type' ? 'Type — Device type (Server, Storage, Network, etc.)'
            : field === 'location' ? 'Location — Data center site/building/floor/room'
            : field === 'model' ? 'Model — Hardware model'
            : field === 'brand' ? 'Brand — Vendor/brand'
            : field === 'floor' ? 'Floor — Room floor number'
            : field === 'region' ? 'Region — Data center site'
            : field }
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label htmlFor="aggregation">Aggregation</Label>
  {/* Aggregation: How to summarize the data. */}
  <Select
    value={formData.data_source.aggregation || 'count'}
    onValueChange={(value: string) => updateDataSource('aggregation', value)}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="count">Count — Number of records (ignores field)</SelectItem>
      <SelectItem value="sum">Sum — Total value of selected field (numeric only)</SelectItem>
      <SelectItem value="avg">Average — Mean value of selected field (numeric only)</SelectItem>
      <SelectItem value="min">Minimum — Smallest value in field (numeric only)</SelectItem>
      <SelectItem value="max">Maximum — Largest value in field (numeric only)</SelectItem>
    </SelectContent>
  </Select>
</div>

// Helper arrays for validation
const allFields = ['status', 'type', 'location', 'model', 'brand', 'floor', 'region'];
const numericFields = ['floor']; // Extend with other numeric columns as needed
const numericAggregations = ['sum', 'avg', 'min', 'max'];
```

## 7. Backend Notes
- The backend handler should use `config.field` for sum/avg/min/max aggregations.
- For `count`, the field is ignored.
- Filters are merged from both `filters` and `server_filters` before saving.

**Validation Required:**
- Numeric aggregations (`sum`, `avg`, `min`, `max`) must only be used with numeric fields. Backend should validate and return an error if a non-numeric field is used.
- UI should prevent selection of non-numeric fields for numeric aggregations.
- Error messages should be shown in the UI if the backend returns an error due to invalid field/aggregation combination.

## 8. Extension Steps
- To add new tables or fields, update the `tableFields` mapping and backend handler logic.
- To support new aggregations, update both frontend options and backend handler.

**Implementation Steps:**
1. Update UI to filter/select only numeric fields for numeric aggregations.
2. Update backend to validate field type for aggregation and return error if invalid.
3. Display error messages in the UI if backend returns an error for invalid field/aggregation.

## 9. Example Chart Component (Nivo Stacked Bar)
```tsx
import { ResponsiveBar } from '@nivo/bar'

export const DCIMStatusBarChart = ({ data }) => (
  <div className="h-64 w-full bg-white rounded shadow p-4">
    <ResponsiveBar
      data={data}
      keys={["active", "offline", "maintenance"]}
      indexBy="location"
      margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
      padding={0.3}
      colors={{ scheme: 'nivo' }}
      axisBottom={{ legend: 'Location', legendPosition: 'middle', legendOffset: 32 }}
      axisLeft={{ legend: 'Count', legendPosition: 'middle', legendOffset: -40 }}
      labelSkipWidth={12}
      labelSkipHeight={12}
      theme={{
        axis: { legend: { text: { fontSize: 14 } } },
        labels: { text: { fontSize: 12 } }
      }}
    />
  </div>
)
```

## 10. Documentation & Onboarding
- This file contains all plans, code examples, and integration steps for DCIM chart/data source support.
- Update this file as new chart types, data sources, or features are added.

---
*Created by Copilot on August 8, 2025*
