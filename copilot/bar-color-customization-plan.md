# Per-Widget Bar Color Customization Plan

## Goal
Allow users to set a custom color for the bar of each dashboard widget (e.g., Gauge, Stat) individually.

## Steps

1. **Data Model Update**
   - Add a `color` property to each widget in the backend and frontend models.
   - Default to a standard color if not set.

2. **Widget Edit UI**
   - Update the widget edit dialog to include a color picker for the bar color.
   - Use the same `ColorPicker` component as used in Server Properties for a consistent UI/UX.
   - Save the selected color to the widget's data.

3. **Widget Rendering**
   - Pass the `color` property to the Gauge/Stat widget components.
   - Apply the color to the bar using inline styles or Tailwind classes.

4. **Persistence**
   - Ensure the selected color is saved to and loaded from the backend with other widget properties.

5. **Testing**
   - Test with multiple widgets, each with different colors.
   - Ensure color persists after reload and is applied correctly in the UI.


## Example: Before and After

### Before (Edit Dialog)
```tsx
// ...existing code...
<Input
  id="title"
  value={formData.title}
  onChange={(e) => updateFormData('title', e.target.value)}
  placeholder="Widget title"
/>
// ...existing code...
```

### After (Edit Dialog with ColorPicker)
```tsx
// ...existing code...
<Input
  id="title"
  value={formData.title}
  onChange={(e) => updateFormData('title', e.target.value)}
  placeholder="Widget title"
/>
<Label htmlFor="bar_color">Bar Color</Label>
<ColorPicker
  value={formData.color}
  onChange={(color) => updateFormData('color', color)}
/>
// ...existing code...
```

### Before (Widget Render)
```tsx
<div className="bar" style={{ width: percent + '%' }} />
```

### After (Widget Render with Color)
```tsx
<div className="bar" style={{ width: percent + '%', background: widget.color || defaultColor }} />
```

---
*This plan can be tracked and iterated in the `copilot/` folder as `bar-color-customization-plan.md`.*
