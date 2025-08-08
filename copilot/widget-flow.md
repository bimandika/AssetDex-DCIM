---

# Widget Data Flow: Quick Reference & Best Practices

## Quick Reference Table

| What                | Table/Source                | Notes                        |
|---------------------|----------------------------|------------------------------|
| Widget config       | `dashboard_widgets`         | JSONB config per widget      |
| Data source config  | `widget_data_sources`       | Linked by widget ID          |
| Cached data         | `widget_data_cache`         | For charts/metrics           |
| User filter prefs   | `user_filter_preferences`   | Per user, per filter         |
| Global filter defs  | `global_filter_defaults`    | Defaults for all users       |

---

## Widget Data Flow: Happy Path (5 Steps)

1. **Add Widget:** User adds a widget and sets its data source/config.
2. **Save:** Widget config is saved to `dashboard_widgets` (and `widget_data_sources`).
3. **Fetch Data:** Widget component calls `/functions/v1/widget-data` with config.
4. **Backend Query:** Edge Function queries Postgres and returns data.
5. **Display:** Widget renders the result (chart, metric, etc.).

---

## (Optional) Visual Flow

> [Insert a simple diagram here: Widget Config → Data Source → Edge Function → Postgres → Result → Widget Display]

---
---

## Backend & Database Mapping for Widget Data Flow (2025-08-05)

### 1. Database Schema (from `database/consolidated-migration.sql`)

---

# Step-by-Step: Making a Widget Work (Before & After Code)

This section shows a practical example of how to make a custom widget work, with before/after code for each step.

## 1. Add Widget to Dashboard (Frontend)

**Before:**
```tsx
// Dashboard.tsx (snippet)
const widgets = []; // No widgets yet
```

**After:**
```tsx
// Dashboard.tsx (snippet)
const widgets = [
  {
    id: 'widget-1',
    type: 'metric',
    data_source: { table: 'servers', aggregation: 'count', groupBy: 'status' },
    // ...other config...
  }
];
```

---

## 2. Save Widget Config to Backend

**Before:**
```js
// WidgetEditDialog.tsx (snippet)
// No API call to save widget config
```

**After:**
```js
// WidgetEditDialog.tsx (snippet)
await supabase.from('dashboard_widgets').insert([
  {
    dashboard_id: 'dashboard-1',
    type: 'metric',
    data_source: { table: 'servers', aggregation: 'count', groupBy: 'status' },
    // ...other config...
  }
]);
```

---

## 3. Fetch Data for Widget (Frontend)

**Before:**
```js
// MetricWidget.tsx (snippet)
// No data fetching for widget
```

**After:**
```js
// MetricWidget.tsx (snippet)
const response = await fetch('/functions/v1/widget-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config: widget.data_source })
});
const data = await response.json();
```

---

## 4. Backend: Handle Widget Data Request

**Before:**
```ts
// volumes/functions/widget-data/index.ts (snippet)
// No handler for widget-data
```

**After:**
```ts
// volumes/functions/widget-data/index.ts (snippet)
export const handler = async (req: Request): Promise<Response> => {
  const { config } = await req.json();
  // Example: build query based on config.table, config.aggregation, config.groupBy
  // Query Postgres and return result
  // (Pseudo-code)
  // const result = await supabase.from(config.table).select(...).match(...);
  // return new Response(JSON.stringify({ total: result.length }));
};
```

---

## 5. Display Data in Widget (Frontend)

**Before:**
```tsx
// MetricWidget.tsx (snippet)
<MetricWidget value={null} />
```

**After:**
```tsx
// MetricWidget.tsx (snippet)
<MetricWidget value={data.total} />
```

---

## 6. Test with Real Data (Database)

**Before:**
```sql
-- servers table is empty
```

**After:**
```sql
-- Insert sample data into servers table
INSERT INTO servers (id, hostname, status) VALUES
  ('1', 'server-1', 'Active'),
  ('2', 'server-2', 'Ready');
```

---

# Troubleshooting (Common Issues & What to Check)

If widget data is missing or not displaying as expected:


**After:**
```tsx
1. **Check widget’s `data_source` config** in the database or widget edit dialog.
2. **Check the network request** in browser dev tools:
   - Is the POST to `/functions/v1/widget-data` being made?
   - What is the payload? What is the response?

---

**Summary:**
1. Add widget config (with data_source) in frontend.
2. Save config to backend (`dashboard_widgets`).
3. Fetch data from backend using widget config.
4. Backend handler queries Postgres and returns result.
5. Widget displays the result.

If you follow these steps and update both frontend and backend as shown, your widget should fetch and display real data.
3. **Check backend function** (`volumes/functions/widget-data/index.ts`):
   - Does it handle your widget type/config?
   - Does it return the expected data format?
4. **Check for errors** in browser console and Supabase logs.
5. **Check `widget_data_cache`** for up-to-date results (for charts/metrics).

---

# Custom Dashboard Widget Data Flow (Details)

Widgets are created, configured, and rendered dynamically. They fetch and display real data from the backend, and all changes are persisted. The UI is dynamic, showing only relevant options for each widget type.

**Main Steps:**
1. User adds a widget and selects type/config.
2. Widget config (including `data_source`) is saved to the backend.
3. Widget component fetches data from `/functions/v1/widget-data` using its config.
4. Edge Function queries Postgres and returns the result.
5. Widget displays the data (chart, metric, etc.).
6. All changes are persisted; dashboard reload fetches all widget configs and data.

**Widget Actions:** Edit (open config), Delete (remove), Refresh (re-fetch data).

**Persistence:** All widget changes are saved to the backend and reloaded on dashboard load.

---


The /functions/v1/widget-data endpoint is handled by the Edge Function in index.ts. Here’s how it fetches widget data from Postgres:

The handler parses the incoming request and determines the action (e.g., create_widget, update_widget, etc.).
For widget data, the relevant actions are create_widget, update_widget, and delete_widget.
When creating or updating a widget, the function expects a payload with widget details, including dashboard_id, title, widget_type, position, config, data_source, and filters.
The function uses the Supabase client to perform SQL operations on the dashboard_widgets table (and related tables like widget_data_sources if needed).
For example, creating a widget inserts a row into dashboard_widgets with the provided data, and the data_source field can specify which Postgres table/query to use for the widget’s data.
The actual data fetching for widget display is based on the data_source configuration stored in the widget row, which the frontend or another backend function can use to query the appropriate Postgres data.
Summary:
The endpoint does not directly fetch widget data for display; it manages widget metadata and configuration in Postgres. The data_source field in each widget defines how/where to fetch the actual data, and this is used by the frontend or another backend process to query Postgres as needed.

If you want a step-by-step trace of how a widget’s data is actually queried for display, let me know!


## 1. Widget Creation & Data Source
- When you add a widget, its configuration (including `data_source`) is saved in the `dashboard_widgets` table.
- The `data_source` field defines what table, aggregation, groupBy, and filters to use (e.g., `{ table: 'servers', aggregation: 'count' }`).

## 2. Widget Rendering in the Dashboard
- When the dashboard loads, it fetches the list of widgets and their configs from the backend.
- Each widget component (e.g., `SimpleMetricWidget`, `EnhancedChartWidget`, `StatWidget`, `GaugeWidget`) tries to fetch its data using the config in `widget.data_source`.

## 3. Widget Data Fetching (Frontend)
- Each widget calls a function like `fetchWidgetData(config)` (see `StatWidget.tsx`, `GaugeWidget.tsx`, `EnhancedChartWidget.tsx`).
- This function sends a POST request to `/functions/v1/widget-data` with the widget’s `data_source` as the payload.

## 4. Widget Data Fetching (Backend)
- The `/functions/v1/widget-data` endpoint (Edge Function) receives the config and is supposed to:
  - Parse the config (table, aggregation, filters, etc.)
  - Build and run a query against Postgres
  - Return the result (e.g., count, grouped data, etc.)

## 5. Widget Data Display
- The widget receives the result and displays it.
- If the result is empty, null, or an error, the widget shows nothing or an error message.

---

## Why Data Might Not Show
- **Missing/Invalid `data_source`:** If the widget’s `data_source` is empty or malformed, the backend can’t query data.
- **Backend Not Implemented:** If `/functions/v1/widget-data` does not handle your widget’s config or type, it returns nothing.
- **Auth Issues:** If the frontend doesn’t send a valid JWT, the backend may reject the request.
- **No Data in Table:** If the target table (e.g., `servers`) is empty, the result is empty.
- **Widget Type Not Supported:** If the backend only supports certain widget types (e.g., only `metric` and `chart`), others won’t work.

---

## What to Check/Do Next
1. **Check the widget’s `data_source` config** in the database or in the widget edit dialog.
2. **Check the network request** in your browser’s dev tools:
   - Is the POST to `/functions/v1/widget-data` being made?
   - What is the payload? What is the response?
3. **Check the backend function** (`volumes/functions/widget-data/index.ts` or similar):
   - Does it handle your widget type and config?
   - Does it return the expected data format?
4. **Check for errors** in the browser console and Supabase logs.

---

If you want to debug a specific widget or trace a failing request step-by-step, check the widget type, config, and the backend handler logic.


---

## How to Make a Widget Work with Real Data (Using This Flow)

To ensure your custom widget works with real data, follow these steps using the same structure/flow described above:

1. **Widget Data Source**
   - In the widget edit dialog, set the `data_source` field to match your real database table and columns (e.g., `{ table: 'servers', aggregation: 'count', groupBy: 'status' }`).
   - Make sure the table and fields exist in your Postgres database and contain real data.

2. **Widget Save & Backend Sync**
   - When you save the widget, its config (including `data_source`) is persisted to the backend (`dashboard_widgets` table).
   - Confirm the widget row in the database has the correct `data_source` JSON.

3. **Widget Data Fetching**
   - The widget component will call `fetchWidgetData(config)` on mount or when config changes.
   - This sends a POST to `/functions/v1/widget-data` with your config.

4. **Backend Handler**
   - The Edge Function (`volumes/functions/widget-data/index.ts`) must:
     - Parse the incoming config (table, aggregation, filters, etc.)
     - Build and execute the correct SQL query on Postgres
     - Return the result in the expected format (e.g., `{ total: 42 }` for a metric/count)
   - If you add new widget types or query logic, update this function to support them.

5. **Frontend Display**
   - The widget receives the backend result and displays it.
   - If the widget shows no data, check the network response and backend logs for errors.

6. **Test with Real Data**
   - Populate your database table with real records.
   - Refresh the dashboard and confirm the widget displays the correct data.

**Tip:**
- Always check the widget’s `data_source` config, the network request/response, and the backend handler logic if data does not appear.
- Use browser dev tools and Supabase logs for troubleshooting.
