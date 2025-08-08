# DCIM Chart Integration Plan

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
5. Document supported chart types and config in copilot folder

---

# DCIM Chart Integration Code Example

## copilot/dcim-chart-plan.md
- This file (plan, chart types, config example)

## copilot/dcim-chart-widget-example.tsx
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

## copilot/dcim-chart-widget-readme.md
- How to use DCIM charts, supported types, config, integration steps
