# List Widget Implementation Plan

## Goal
Create a reusable List Widget component that displays all rows from the fixed 'server' table, showing two user-chosen columns. The widget should be scrollable and configurable, with backend support for efficient data retrieval. The widget title is configurable and used for display. The user can select any two columns from the 'server' table to display.

---

## 1. Frontend (React)

### Component: `ListWidget`
Props:
  - `title`: string (widget title)
  - `columns`: string[] (1-3 columns to display, user-selectable; default is 1 column)
  - `height`: number (height in px or vh for scrollable area)
- Features:
  - Fetches all rows for the fixed table/columns using React Query.
  - Displays a scrollable list (e.g., using a Card with fixed height and overflow-y: auto).
  - Shows each row with 1-3 columns (e.g., left/right or stacked).
  - Handles loading, error, and empty states.
  - Allows user to select 1-3 columns from the 'server' table via dropdowns or settings.

### UI/UX
- Use shadcn/ui or Tailwind for styling.
- Card or Panel container, with header (title, column selectors), scrollable body.
- Responsive for mobile/desktop.

---


## 2. Backend (Supabase Edge Function)

### New Edge Function: `list-widget-data`
Existing backend functions (`widget-data`, `chart-widget-data`) do not support fetching arbitrary columns for list widgets. A new Edge Function is required.

**API Endpoint:** `/list-widget-data`

**Input:**
- `columns`: string[] (required, e.g. `["hostname", "ip_address"]`)
- `filters`: object (optional, for future extensibility)
- `limit`, `offset`: number (optional, for pagination)

**Output:**
- Array of rows, each with only the requested columns from the `server` table.

**Logic:**
- Validate requested columns against the `server` table schema (use `/get-table-schema` if needed).
- Query Supabase for all rows, selecting only the requested columns.
- Support pagination and filtering if needed.
- Return data as JSON array.

**Security:**
- Only allow permitted columns to be queried.

**Example Request:**
```json
{
  "columns": ["hostname", "ip_address"],
  "limit": 100,
  "offset": 0
}
```

**Example Response:**
```json
[
  { "hostname": "server1", "ip_address": "10.0.0.1" },
  { "hostname": "server2", "ip_address": "10.0.0.2" }
]
```

---

## 3. Integration
- Add a 'List Widget' button to the Add Widget section in the custom dashboard, alongside Chart, Metrics, Timeline, Stat, and Gauge widgets.
- Clicking the button should open the ListWidgetEditDialog for configuration.
- Add ListWidget to dashboard or any page.
- Allow configuration (columns, title, height) via props or settings. User can select columns at runtime.
- Optionally, allow user to select table/columns at runtime (advanced).

---

## 4. Example Usage
```tsx
<ListWidget title="Server Hostnames & IPs" columns={["hostname", "ip_address"]} height={400} />
```

---


## 5. Steps
1. Create `ListWidget.tsx` in `src/components/widgets/`.
2. Create `ListWidgetEditDialog.tsx` in `src/components/widgets/` for editing List Widget settings (title, columns, height).
   - UI/UX Details:
     - Dialog header: "Edit List Widget"
     - Fields:
       - Title (Input)
       - Column 1 (Dropdown, populated from server table schema; required)
       - Column 2 (Dropdown, optional, populated from server table schema; shown if user clicks '+')
       - Column 3 (Dropdown, optional, populated from server table schema; shown if user clicks '+')
       - '+' button to add more columns (up to 3)
       - Height (Input, number, min=1, labeled 'Height', represents grid units)
     - (Optional) Filters section for future extensibility
     - Buttons: Cancel and Save (aligned top-right or bottom-right)
     - Responsive layout, using shadcn/ui or Tailwind
     - Show validation/error messages for required fields
3. Implement props, data fetching, scrollable UI for the fixed table.
4. Add to dashboard, test with different columns.
5. (Optional) Add dynamic column selection UI in the edit dialog (support 1-3 columns).
6. Document usage in README.

---

## 6. Backend Notes
- No new backend code needed if using Supabase REST API.
- For advanced filtering or security, add an Edge Function.

---

## 7. Future Enhancements
- Support more than two columns (configurable).
- Add sorting/filtering.
- Allow row click for details.
- Widget settings persistence.

---

## References
- See baseline code for widget structure and Supabase integration.
- Use React Query for data fetching.
- Use shadcn/ui for consistent UI.

---


## How to Execute This Plan

You can follow these actionable steps to implement the List Widget feature:

1. Create the frontend component:
   - Run: `touch src/components/widgets/ListWidget.tsx`
   - Run: `touch src/components/widgets/ListWidgetEditDialog.tsx`
2. Implement the backend Edge Function:
   - Run: `mkdir -p volumes/functions/list-widget-data`
   - Run: `touch volumes/functions/list-widget-data/index.ts`
3. Add the List Widget button to your dashboard UI.
4. Use the code and UI/UX details in this plan to guide your implementation.
5. Test the widget in your dashboard and iterate as needed.

You can copy-paste the code snippets and UI/UX details from this plan into your project files. This plan is designed to be executable and self-sufficient, even if you start from a new chat.

## File Locations
- Component: `src/components/widgets/ListWidget.tsx`
- Dialog: `src/components/widgets/ListWidgetEditDialog.tsx`
- Backend: `volumes/functions/list-widget-data/index.ts`
- Plan: `copilot/list-widget.md`
