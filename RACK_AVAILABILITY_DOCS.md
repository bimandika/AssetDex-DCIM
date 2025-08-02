# Rack Availability System

This system provides real-time rack space availability checking for server placement in data center management.

## Components

### 1. Backend Function: `check-rack-availability`

**Location:** `/volumes/functions/check-rack-availability/index.ts`
**Endpoint:** `POST /check-rack-availability` (integrated via main/index.ts)
**Methods:** `POST`, `OPTIONS`

**Purpose:** Validates server placement and provides availability information

**Input:**
```typescript
{
  rack: string;           // e.g., "RACK-37"
  position: number;       // e.g., 42 (for U42)
  unitHeight: number;     // e.g., 10 (for 10U server)
  excludeServerId?: string; // For edit operations
}
```

**Output:**
```typescript
{
  available: boolean;
  conflictingServers?: ServerInRack[];
  availableSpaces?: AvailableSpace[];
  suggestion?: {
    position: number;
    reason: string;
  };
}
```

### 2. React Hook: `useRackAvailability`

**Location:** `/src/hooks/useRackAvailability.ts`

**Usage:**
```typescript
const { checkAvailability, loading, error } = useRackAvailability();

const result = await checkAvailability('RACK-37', 42, 10);
if (result.available) {
  // Proceed with server placement
} else {
  // Show conflicts and suggestions
}
```

### 3. React Component: `RackAvailabilityChecker`

**Location:** `/src/components/RackAvailabilityChecker.tsx`

**Usage:**
```tsx
<RackAvailabilityChecker
  rack="RACK-37"
  position={42}
  unitHeight={10}
  excludeServerId="server-123" // For edit mode
  onSuggestionApply={(position) => setPosition(position)}
/>
```

### 4. Complete Form Example: `ServerForm`

**Location:** `/src/components/forms/ServerForm.tsx`

**Features:**
- Real-time availability checking as user types
- Visual conflict warnings
- Automatic suggestions for alternative positions
- Integration with form validation

## Key Features

### ✅ Conflict Detection
- Identifies overlapping servers
- Shows exact conflicting hostnames and positions
- Prevents double-booking of rack units

### 🎯 Smart Suggestions
- Automatically finds best available positions
- Prioritizes top-of-rack placement
- Considers server height requirements

### 📊 Visual Feedback
- Real-time availability status
- Color-coded alerts (green/red/yellow)
- Available space visualization

### 🔄 Edit Mode Support
- Excludes current server from conflict check
- Allows moving servers to new positions
- Validates new placement before save

## Usage Examples

### Adding a New Server
```typescript
// 1. User selects rack and enters position
const rack = "RACK-37";
const position = 42;
const unitHeight = 10;

// 2. Check availability
const result = await checkAvailability(rack, position, unitHeight);

// 3. Handle result
if (!result.available) {
  // Show conflicts and suggest alternative
  console.log('Conflicts:', result.conflictingServers);
  console.log('Suggestion:', result.suggestion);
}
```

### Editing Existing Server
```typescript
// Exclude current server from conflict check
const result = await checkAvailability(
  "RACK-37", 
  35, 
  2, 
  "current-server-id"
);
```

### Finding Available Spaces
```typescript
const result = await checkAvailability("RACK-37", 1, 1);
console.log('Available spaces:', result.availableSpaces);
// Output: [
//   { startUnit: 42, endUnit: 35, size: 7 },
//   { startUnit: 30, endUnit: 20, size: 10 }
// ]
```

## Integration Points

1. **Server Inventory Forms** - Validate placement during add/edit
2. **Rack Visualization** - Show availability overlay
3. **Capacity Planning** - Identify available spaces
4. **Move Operations** - Validate server relocations

## Benefits

- **Prevents conflicts** - No more overlapping server placements
- **Improves UX** - Real-time feedback and suggestions
- **Reduces errors** - Automated validation prevents manual mistakes
- **Saves time** - Quick identification of available spaces

## Deployment

✅ **The `check-rack-availability` function is fully integrated into the main Edge Functions router.**

**Integration Status:**
- Added to `/volumes/functions/main/index.ts` 
- Endpoint: `POST /check-rack-availability`
- Handler export pattern implemented
- Ready for deployment with existing infrastructure
