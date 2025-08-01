# Fix Plan: Rack Size Inconsistencies in RoomView

## 🔍 **Problem Analysis**

From the provided image and code analysis, there are two main issues:

### **1. Inconsistent Unit Heights**
- **RackView**: Uses `unitHeight * 2.5rem` for multi-unit servers
- **RoomView**: Uses `unitHeight * 1.2rem` for multi-unit servers
- **Result**: Racks appear different sizes between views

### **2. Inconsistent 1U Rack Unit Heights**
- **RackView**: All units have consistent `min-h-6` (1.5rem) for 1U servers
- **RoomView**: Mixed heights with `min-h-6` but variable content styling
- **Result**: 1U units appear different sizes within the same view

## 🎯 **Root Causes**

1. **Different Height Multipliers**: RoomView uses 1.2rem vs RackView's 2.5rem
2. **Inconsistent Base Unit Height**: Different approaches to calculating base unit size
3. **Variable Content Styling**: Text content affects visual height differently
4. **Missing Standardization**: No shared constants or components for rack visualization

## 🔧 **Solution Plan**

### **Step 1: Standardize Unit Height Constants**
Create shared constants for rack unit dimensions:
```typescript
// Shared constants
const RACK_UNIT_HEIGHT = 2.5; // rem per unit (matching RackView)
const BASE_UNIT_HEIGHT = 1.5; // rem for 1U (min-h-6)
```

### **Step 2: Fix RoomView Unit Heights**
- Update multi-unit server heights to use `unitHeight * 2.5rem`
- Ensure 1U servers use consistent `1.5rem` height
- Match the exact styling patterns from RackView

### **Step 3: Standardize Visual Styling**
- Use consistent padding, margins, and border styles
- Ensure text content doesn't affect unit height
- Apply consistent hover and selection states

### **Step 4: Create Shared Rack Unit Component**
Consider creating a reusable `RackUnit` component to ensure consistency

## 📋 **Implementation Steps**

1. **Update RoomView multi-unit heights**: Change `1.2rem` to `2.5rem`
2. **Standardize 1U unit styling**: Ensure all 1U units use same base height
3. **Fix content overflow**: Prevent text from affecting unit dimensions
4. **Test visual consistency**: Compare RoomView and RackView side by side

## 🎨 **Expected Results**

After fixes:
- ✅ All racks appear same size across RoomView and RackView
- ✅ 1U units have consistent height regardless of content
- ✅ Multi-unit servers scale proportionally (2U = 2x height, 3U = 3x height)
- ✅ Visual consistency across the entire application

## 🧪 **Testing Strategy**

1. **Visual Comparison**: Open RoomView and RackView side by side
2. **Multi-Unit Testing**: Check 2U, 3U, 4U servers appear correctly
3. **1U Consistency**: Verify all 1U servers have same height
4. **Responsive Testing**: Check consistency across different screen sizes
