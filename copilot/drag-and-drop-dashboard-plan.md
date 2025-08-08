# Dashboard Widget Drag-and-Drop Plan

## Goal
Enable users to visually rearrange and resize dashboard widgets (like Grafana) using drag-and-drop in the Custom Dashboard.

## Steps

1. **Choose a Grid Library**
   - Use `react-grid-layout` for drag, drop, and resize support.
   - Install: `npm install react-grid-layout`

2. **Refactor Widget Grid**
   - Replace the current CSS grid with `<ResponsiveGridLayout>` from `react-grid-layout`.
   - Map each widget to a grid item using its `id`, `position_x`, `position_y`, `width`, and `height`.

3. **Sync Layout State**
   - On drag/resize, update the widget positions in local state.
   - On save, persist new positions to the backend (update each widget's `position_x`, `position_y`, `width`, `height`).

4. **UI/UX**
   - Show drag handles when in edit mode.
   - Optionally, add a "Save Layout" button to persist changes.
   - Prevent overlap and enforce grid boundaries.

5. **Backend**
   - Ensure the backend supports updating widget positions and sizes.
   - Batch update if possible for efficiency.

6. **Testing**
   - Test with various widget types and dashboard sizes.
   - Ensure layout is responsive and persists after reload.


## Example: Before and After Refactor

### Before (CSS Grid)

```tsx
<div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
  {currentDashboard?.dashboard_widgets?.map((widget) => (
    <div key={widget.id} style={getWidgetStyle(widget)}>
      {renderWidget(widget)}
    </div>
  ))}
</div>
```

### After (react-grid-layout)

```tsx
import RGL, { WidthProvider } from 'react-grid-layout';
const ResponsiveGridLayout = WidthProvider(RGL);

<ResponsiveGridLayout
  className="layout"
  cols={12}
  rowHeight={100}
  layout={widgets.map(w => ({
    i: w.id,
    x: w.position_x,
    y: w.position_y,
    w: w.width,
    h: w.height
  }))}
  onLayoutChange={handleLayoutChange}
>
  {widgets.map(w => (
    <div key={w.id}>{renderWidget(w)}</div>
  ))}
</ResponsiveGridLayout>
```

## Next Steps
- [ ] Install and set up `react-grid-layout`.
- [ ] Refactor dashboard grid to use the new layout.
- [ ] Implement position persistence.
- [ ] Test and polish UX.

---

*This plan can be tracked and iterated in the `copilot/` folder as `drag-and-drop-dashboard-plan.md`.*
