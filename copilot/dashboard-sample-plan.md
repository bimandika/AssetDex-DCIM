---
# Dashboard Sample Creation Plan

## Goal
Create 3 sample dashboards, each with a minimum of 10 widgets, to demonstrate the data flow and widget capabilities described in `widget-flow.md`.

---

## Dashboard Overview
---

## Example SQL Queries for Widgets

-- ============================================================================
-- 16. SAMPLE DASHBOARD DATA
-- ============================================================================
-- Add sample dashboards and widgets to demonstrate custom dashboard functionality
-- Uses existing server data (300+ servers already in the system)

INSERT INTO public.dashboards (id, name, description, layout, filters, settings, status, is_public, user_id)
VALUES (
  gen_random_uuid(),
  'Server Allocation Overview',
  'Dashboard showing server counts and allocation breakdowns',
  '[]'::jsonb,
  '{}'::jsonb,
  '{"theme": "default", "autoRefresh": true, "refreshInterval": 300, "gridSize": 12}'::jsonb,
  'active',
  true,
  (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'Total Servers',
  0, 0, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'chart',
  'Servers by Allocation',
  4, 0, 6, 1,
  '{"type": "bar", "showLegend": true}'::jsonb,
  '{"table": "servers", "groupBy": "allocation", "aggregation": "count"}'::jsonb,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'IAAS Servers',
  0, 1, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[{"field": "allocation", "operator": "equals", "value": "IAAS"}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'PAAS Servers',
  4, 1, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[{"field": "allocation", "operator": "equals", "value": "PAAS"}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'Database Servers',
  8, 1, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[{"field": "allocation", "operator": "equals", "value": "Database"}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'chart',
  'Allocation Trend (12 months)',
  0, 2, 12, 2,
  '{"type": "line", "showLegend": true}'::jsonb,
  '{"table": "servers", "groupBy": "allocation", "aggregation": "count", "dateField": "created_at", "dateRange": "12m"}'::jsonb,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'Load Balancer Servers',
  0, 4, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[{"field": "allocation", "operator": "equals", "value": "Load Balancer"}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'chart',
  'Allocation by Environment',
  4, 4, 8, 1,
  '{"type": "stackedBar", "showLegend": true}'::jsonb,
  '{"table": "servers", "groupBy": "environment", "secondaryGroupBy": "allocation", "aggregation": "count"}'::jsonb,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'metric',
  'Servers Added This Month',
  0, 5, 4, 1,
  '{"showTrend": true}'::jsonb,
  '{"table": "servers", "aggregation": "count"}'::jsonb,
  '[{"field": "created_at", "operator": "gte", "value": "' || to_char(date_trunc('month', now()), 'YYYY-MM-DD') || '"}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.dashboard_widgets (id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.dashboards WHERE name = 'Server Allocation Overview' LIMIT 1),
  'chart',
  'Allocation by Device Type',
  4, 5, 8, 1,
  '{"type": "pie", "showLegend": true}'::jsonb,
  '{"table": "servers", "groupBy": "device_type", "secondaryGroupBy": "allocation", "aggregation": "count"}'::jsonb,
  '[]'::jsonb
) ON CONFLICT DO NOTHING;
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'metric',
    'HPE Servers Ready in DC1',
    0, 2, 3, 1,
    '{
        "showTrend": true,
        "showProgress": true,
        "color": "#10b981"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "HPE"},
        {"field": "dc_site", "operator": "equals", "value": "DC1"},
        {"field": "status", "operator": "equals", "value": "Ready"}
    ]'::jsonb
),
-- Widget 2: Dell Servers with IAAS Allocation
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'metric',
    'Dell IAAS Allocated',
    3, 2, 3, 1,
    '{
        "showTrend": true,
        "showProgress": true,
        "color": "#3b82f6"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "Dell"},
        {"field": "allocation", "operator": "equals", "value": "IAAS"}
    ]'::jsonb
),
-- Widget 3: Production Servers by Model
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'chart',
    'Production Servers by Model',
    6, 2, 6, 1,
    '{
        "type": "horizontalBar",
        "showLegend": true,
        "maxItems": 8
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "model",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "environment", "operator": "equals", "value": "Production"}
    ]'::jsonb
),
-- Widget 4: Dell Storage Servers in Maintenance
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Infrastructure Overview' LIMIT 1),
    'metric',
    'Dell Storage Maintenance',
    0, 2, 3, 1,
    '{
        "showTrend": true,
        "showProgress": false,
        "color": "#f59e0b"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "Dell"},
        {"field": "device_type", "operator": "equals", "value": "Storage"},
        {"field": "status", "operator": "equals", "value": "Maintenance"}
    ]'::jsonb
),
-- Widget 5: DC2 Server Status Distribution
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Infrastructure Overview' LIMIT 1),
    'chart',
    'DC2 Server Status',
    3, 2, 4, 1,
    '{
        "type": "doughnut",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "status",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "dc_site", "operator": "equals", "value": "DC2"}
    ]'::jsonb
),
-- Widget 6: Development Environment by Brand
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Infrastructure Overview' LIMIT 1),
    'chart',
    'Dev Environment Brands',
    7, 2, 5, 1,
    '{
        "type": "pie",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "brand",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "environment", "operator": "equals", "value": "Development"}
    ]'::jsonb
),
-- Widget 7: Server Storage Devices Ready Count
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'metric',
    'Storage Devices Ready',
    0, 3, 4, 1,
    '{
        "showTrend": true,
        "showProgress": true,
        "color": "#8b5cf6"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "device_type", "operator": "equals", "value": "Storage"},
        {"field": "status", "operator": "equals", "value": "Ready"}
    ]'::jsonb
),
-- Widget 8: PAAS Allocation by Data Center
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'chart',
    'PAAS by Data Center',
    4, 3, 4, 1,
    '{
        "type": "bar",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "dc_site",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "allocation", "operator": "equals", "value": "PAAS"}
    ]'::jsonb
),
-- Widget 9: High-End Models Distribution
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Server Operations Dashboard' LIMIT 1),
    'chart',
    'High-End Server Models',
    8, 3, 4, 1,
    '{
        "type": "pie",
        "showLegend": true,
        "maxItems": 6
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "model",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "model", "operator": "regex", "value": "(DL380|PowerEdge|Power9|x3650)"}
    ]'::jsonb
),
-- Widget 10: Production Environment Servers
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Infrastructure Overview' LIMIT 1),
    'metric',
    'Production Environment',
    0, 3, 4, 1,
    '{
        "showTrend": true,
        "showProgress": true,
        "color": "#ef4444"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "environment", "operator": "in", "value": ["Production", "Pre-Production"]}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Create a specialized Data Center Analytics dashboard
INSERT INTO public.dashboards (
    id, name, description, layout, filters, settings, status, is_public, user_id
) VALUES (
    gen_random_uuid(),
    'Data Center Analytics',
    'Detailed analytics showing server distributions across data centers with specific model and allocation insights',
    '[]'::jsonb,
    '{}'::jsonb,
    '{
        "theme": "analytics",
        "autoRefresh": true,
        "refreshInterval": 120,
        "gridSize": 12
    }'::jsonb,
    'active',
    true,
    (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Add specialized analytics widgets
INSERT INTO public.dashboard_widgets (
    id, dashboard_id, widget_type, title, position_x, position_y, width, height, config, data_source, filters
) VALUES 
-- DC Analytics Widget 1: Model Distribution in Each DC
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Data Center Analytics' LIMIT 1),
    'chart',
    'Models in DC1 vs DC2',
    0, 0, 6, 2,
    '{
        "type": "groupedBar",
        "showLegend": true,
        "groupBy": ["dc_site", "model"]
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "model",
        "secondaryGroupBy": "dc_site",
        "aggregation": "count"
    }'::jsonb,
    '[]'::jsonb
),
-- DC Analytics Widget 2: Allocation Types by DC
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Data Center Analytics' LIMIT 1),
    'chart',
    'Allocation Types by DC',
    6, 0, 6, 2,
    '{
        "type": "stackedBar",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "dc_site",
        "secondaryGroupBy": "allocation",
        "aggregation": "count"
    }'::jsonb,
    '[]'::jsonb
),
-- DC Analytics Widget 3: Ready HPE Servers by Location
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Data Center Analytics' LIMIT 1),
    'metric',
    'Ready HPE DL380 Servers',
    0, 2, 3, 1,
    '{
        "showTrend": true,
        "showProgress": true,
        "color": "#059669"
    }'::jsonb,
    '{
        "table": "servers",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "HPE"},
        {"field": "model", "operator": "contains", "value": "DL380"},
        {"field": "status", "operator": "equals", "value": "Ready"}
    ]'::jsonb
),
-- DC Analytics Widget 4: Dell PowerEdge IAAS Distribution
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Data Center Analytics' LIMIT 1),
    'chart',
    'Dell PowerEdge IAAS by DC',
    3, 2, 6, 1,
    '{
        "type": "bar",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "dc_site",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "Dell"},
        {"field": "model", "operator": "contains", "value": "PowerEdge"},
        {"field": "allocation", "operator": "equals", "value": "IAAS"}
    ]'::jsonb
),
-- DC Analytics Widget 5: Dell Network Equipment Status
(
    gen_random_uuid(),
    (SELECT id FROM public.dashboards WHERE name = 'Data Center Analytics' LIMIT 1),
    'chart',
    'Dell Network Equipment Status',
    9, 2, 3, 1,
    '{
        "type": "doughnut",
        "showLegend": true
    }'::jsonb,
    '{
        "table": "servers",
        "groupBy": "status",
        "aggregation": "count"
    }'::jsonb,
    '[
        {"field": "brand", "operator": "equals", "value": "Dell"},
        {"field": "device_type", "operator": "equals", "value": "Network"}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Update statistics for PostgreSQL to optimize queries
ANALYZE public.servers;
ANALYZE public.dashboards;
ANALYZE public.dashboard_widgets;



### Dashboard 1: Server Allocation Overview
- Focus: Server counts and distribution by allocation type
- Widgets:
  1. Metric: Total servers
  2. Chart: Servers by allocation (bar)
  3. Metric: IAAS servers
  4. Metric: PAAS servers
  5. Metric: Database servers
  6. Chart: Allocation trend (last 12 months)
  7. Metric: Load Balancer servers
  8. Chart: Allocation by environment (stacked bar)
  9. Metric: Servers added this month
 10. Chart: Allocation by device type (pie)

### Dashboard 2: Server Environment & Status
- Focus: Server counts and distribution by environment and status
- Widgets:
  1. Metric: Total servers
  2. Chart: Servers by environment (bar)
  3. Metric: Production servers
  4. Metric: Development servers
  5. Metric: Testing servers
  6. Chart: Servers by status (pie)
  7. Metric: Active servers
  8. Metric: Servers in maintenance
  9. Chart: Environment trend (last 12 months)
 10. Metric: Servers added this month

### Dashboard 3: Server Model & Brand Diversity
- Focus: Server counts and distribution by model, brand, and other attributes
- Widgets:
  1. Metric: Total servers
  2. Chart: Servers by brand (bar)
  3. Chart: Servers by model (pie)
  4. Metric: Dell servers
  5. Metric: HPE servers
  6. Metric: NetApp storage devices
  7. Chart: Device type distribution (bar)
  8. Metric: Servers with warranty expiring soon
  9. Chart: Servers by operating system (pie)
 10. Metric: Servers added this month

---

## Implementation Steps
1. Define dashboard configs in the frontend (e.g., `Dashboard.tsx`).
2. For each dashboard, create at least 10 widget configs (type, data_source, etc.).
3. Save widget configs to backend (`dashboard_widgets`).
4. Ensure each widget fetches and displays real or sample data.
5. Validate data flow and rendering for all widgets.
6. Document sample configs and results in this plan.

---

## Notes
- Use a mix of metric and chart widgets for variety.
- Ensure each widget has a meaningful data source and config.
- Reference `widget-flow.md` for best practices and troubleshooting.
- Update this plan as dashboards and widgets are created.

---
