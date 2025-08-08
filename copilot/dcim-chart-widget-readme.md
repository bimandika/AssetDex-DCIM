# DCIM Chart Widget Integration

## Supported Chart Types
- Stacked Bar Chart: Status/capacity by location, floor, rack
- Heatmap: Utilization by rack/room
- TreeMap/Sunburst: Hierarchical capacity
- Timeline: Event history
- Gauge/Donut: Overall metrics

## How to Use
1. Install chart library (e.g. Nivo: `npm install @nivo/bar @nivo/heatmap @nivo/treemap @nivo/sunburst`)
2. Use provided example component (see `dcim-chart-widget-example.tsx`)
3. Pass data from backend (via widget-data function) to chart component
4. Style chart container and controls with Tailwind

## Widget Config Example
```
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

## Integration Steps
- Update frontend to allow flexible hierarchical filter selection
- Ensure only valid fields sent to backend
- Backend maps fields and applies filters
- ChartWidget renders chart using selected type and data

## Customization
- Add more chart types as needed
- Extend backend to support new aggregations or data sources
- Use Tailwind for custom UI/UX

---
For more details, see `dcim-chart-plan.md` and `dcim-chart-widget-example.tsx`.
