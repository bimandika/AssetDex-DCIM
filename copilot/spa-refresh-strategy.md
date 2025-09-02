# SPA Refresh Strategy - Prevent Homepage Redirect

## Problem Statement
Currently, when users refresh the page in our DCIM SPA application, they lose their current context (dashboard state, filters, pagination, forms) and are redirected to the homepage, forcing them to start over.

## Goals
1. **Preserve Current Page**: Stay on the same route after refresh
2. **Maintain State**: Keep user's work (filters, pagination, form data)
3. **Improve UX**: Seamless experience without data loss
4. **Enable Deep Linking**: Allow bookmarking and sharing specific views

## Implementation Plan

### Phase 1: Client-Side Routing Configuration ✅
**Status**: COMPLETED - React Router properly configured with URL-based navigation
- [x] Verify `BrowserRouter` is configured correctly ✅ (confirmed in App.tsx)
- [x] Check server configuration serves `index.html` for all routes ✅ (nginx.conf properly configured)
- [x] Test refresh behavior on different routes ✅ (implemented URL-based tab routing)
- [x] Add specific routes for all main views ✅ (/serverinventory, /roomview, /rackview, etc.)
- [x] Verify catch-all route (*) properly handles unknown URLs ✅ (NotFound component)

### Phase 2: URL State Management
**Priority**: High | **Timeline**: 1-2 days

#### 2.1 Dashboard Widget State
- Store widget-specific state in URL parameters
- Each widget gets unique URL params using widget ID
- Example: `?widget_123_page=2&widget_123_filters={"status":"active"}`

**Files to modify**:

**Widget Components** (All need URL state for their specific settings):
- `ListWidget.tsx` - Add URL state for pagination and filters ✅ **(DONE)**
- `EnhancedChartWidget.tsx` - Store chart configuration in URL ❌ **(Not needed, config is from props)**
- `GaugeWidget.tsx` - Preserve gauge settings and thresholds ❌ **(No user-editable state, not needed)**
- `StatWidget.tsx` - Store stat configuration and filters ❌ **(No user-editable state, not needed)**
- `TimelineWidget.tsx` - Timeline view state and date ranges ✅ **(DONE)**
- `ServerMetricWidget.tsx` - Metric selection and time periods ✅ **(DONE)**
- `SimpleMetricWidget.tsx` - Simple metric configuration ✅ **(DONE)**
- `DashboardWidget.tsx` - Generic widget wrapper state ✅ **(DONE)**
- `CustomDashboard.tsx` - Dashboard layout and widget arrangements ✅ **(DONE)**
- `DashboardBuilder.tsx` - Dashboard creation state ✅ **(DONE)**

**Edit Dialog Components** (Need form auto-save and recovery):
- `ListWidgetEditDialog.tsx` - Form state persistence ✅ **(DONE)**
- `ChartWidgetEditDialog.tsx` - Chart config form auto-save & URL state ✅ **(DONE)**
- `WidgetEditDialog.tsx` - Generic widget edit form state ❌ **(Not found in codebase)**
- `EditServerDialog.tsx` - Server edit form auto-save ✅ **(DONE)**
- `FilterManagerDialog.tsx` - Filter configuration state ✅ **(DONE)**
- `SettingsDialog.tsx` - Application settings state ✅ **(DONE)**
- `ChangePasswordDialog.tsx` - Password change form state ✅ **(DONE)**

**Main View Components** (Need navigation state and filters):
- `DataCenterView.tsx` - Selected DC, floor, room navigation state ✅ **(DONE)**
- `FloorView.tsx` - Floor selection and layout state ✅ **(DONE)**
- `RoomView.tsx` / `RoomView-updated.tsx` - Room view state and filters ✅ **(DONE)**
- `RackView.tsx` - Rack selection and server positions ✅ **(DONE)**
- `ServerInventory.tsx` - Pagination, filters, sort order ✅ **(DONE)**

**Data Center Components** (Need state persistence): ⭐ NEW CATEGORY
- `datacenter/ServerSearch.tsx` - Search query, filters, results pagination ✅ **(DONE)**
- `datacenter/RackVisualization.tsx` - Visualization mode, selected racks, zoom level ✅ **(DONE)**

**Form Components** (Critical for auto-save):
- `forms/ServerForm.tsx` - Server creation/edit form auto-save ✅ **(DONE)**
- `forms/DynamicFormField.tsx` - Individual field state recovery ✅ **(DONE)**
- `forms/DynamicFormRenderer.tsx` - Form renderer state management ✅ **(DONE - Fixed compilation errors)**

**Property Management Components** (Need state persistence): ⭐ NEW CATEGORY
- `property-management/BulkImport.tsx` - Import progress, file selection, mapping state ✅ **(DONE)**

**Management Components** (Need state persistence):
- `UserManagement.tsx` - User list pagination and filters ✅ **(DONE)**
- `Reports.tsx` - Report parameters and filters ✅ **(DONE)**
- `ServerProperties.tsx` / `ServerProperties-backup.tsx` - Property editor state ✅ **(DONE)**
- `ServerPositionHistory.tsx` - History view filters and pagination ✅ **(DONE)**
- `RackAvailabilityChecker.tsx` - Availability search state ✅ **(DONE)**
- `EnumColorManager.tsx` / `EnumColorDemo.tsx` - Color scheme configuration ✅ **(DONE)**

#### 2.2 Global Dashboard State
- Current dashboard ID in URL path: `/dashboard/:dashboardId`
- Edit mode state: `?editMode=true`
- Selected widgets: `?selected=widget1,widget2`

#### 2.3 Navigation State
- Data Center hierarchy: `/datacenter/:site/:building/:floor/:room`
- Current view mode: `?view=floor|room|rack|visualization`
- Selected assets: `?selectedServers=id1,id2,id3`
- Rack visualization state: `?rackView=grid|list&zoom=1.2`

#### 2.4 Inventory and Management State
- Server inventory filters: `?status=active&environment=prod&page=2`
- Server search queries: `?search=hostname&searchFilters={"site":"DC1"}`
- User management pagination: `?userPage=3&role=admin`
- Report parameters: `?reportType=capacity&dateRange=30d`
- Bulk import progress: `?importSession=abc123&step=mapping`

#### 2.5 Advanced Features State ⭐ NEW
- Filter preferences: `?filterPrefs=persistent&autoEnable=true`
- Widget cache settings: `?cacheEnabled=true&refreshInterval=300`
- Enum color configurations: `?colorScheme=custom&theme=dark`

### Phase 3: Local Storage Backup
**Priority**: Medium | **Timeline**: 2-3 days

#### 3.1 Form Data Auto-Save
- Auto-save form data every 5 seconds
- Store in localStorage with unique keys
- Restore on component mount

**Implementation**:
```typescript
// Hook: useAutoSave.ts
const useAutoSave = (formData, formId) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`form_${formId}`, JSON.stringify(formData));
    }, 5000);
    return () => clearTimeout(timer);
  }, [formData, formId]);
};

// Critical forms that need auto-save:
// - ServerForm.tsx (server creation/editing)
// - EditServerDialog.tsx (quick server edits)
// - All widget edit dialogs (ListWidgetEditDialog, ChartWidgetEditDialog, etc.)
// - FilterManagerDialog.tsx (complex filter configurations)
// - UserManagement.tsx (user creation/editing)
// - BulkImport.tsx (import progress and mapping state) ⭐ NEW
// - CustomDashboard.tsx (dashboard layout changes) ⭐ NEW
// - ServerSearch.tsx (complex search configurations) ⭐ NEW
```

#### 3.2 Dashboard Layout Persistence
- Save dashboard layout changes immediately
- Store widget positions, sizes, configurations
- Restore on page load

#### 3.3 User Preferences
- Current filters across all widgets
- Pagination settings (items per page)
- UI preferences (theme, sidebar state)
- Persistent filter preferences (usePersistentFilterPreferences) ⭐ NEW
- Widget cache configurations (useWidgetCache) ⭐ NEW
- Enum color scheme preferences ⭐ NEW

### Phase 4: Session Recovery
**Priority**: Medium | **Timeline**: 1 day

#### 4.1 Crash Detection
- Detect unexpected page reload vs intentional navigation
- Show "Restore previous session?" dialog

#### 4.2 Recovery Mechanism
```typescript
// On app startup
const checkForCrash = () => {
  const hasUnsavedData = localStorage.getItem('hasUnsavedData');
  const lastActivity = localStorage.getItem('lastActivity');
  
  if (hasUnsavedData && Date.now() - lastActivity < 300000) { // 5 minutes
    showRecoveryDialog();
  }
};
```

### Phase 5: Server Configuration
**Priority**: High | **Timeline**: 1 day

#### 5.1 Nginx/Apache Configuration
Ensure server returns `index.html` for all SPA routes:

```nginx
# nginx.conf
server {
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  # API routes should not fallback to index.html
  location /api {
    proxy_pass http://backend;
  }
}
```

#### 5.2 Development Server
- Verify Vite dev server handles SPA routing
- Configure historyApiFallback for production builds

### Phase 6: Error Boundaries & Fallbacks
**Priority**: Low | **Timeline**: 1 day

#### 6.1 React Error Boundaries
- Catch component crashes
- Show fallback UI instead of white screen
- Preserve other widgets when one crashes

#### 6.2 Network Error Handling
- Handle API failures gracefully
- Retry mechanisms for critical data
- Offline mode with cached data

## Technical Implementation Details

### URL State Structure
```
Base Routes:
/auth                           // Authentication page
/                              // Main dashboard (Index.tsx)
/datacenter/:site/:building    // DataCenterView hierarchy
/floor/:floorId               // FloorView with floor selection
/room/:roomId                 // RoomView with room details
/rack/:rackId                 // RackView with server positions

Query Parameters:
/dashboard?
  editMode=true&                    // Dashboard edit mode
  selectedWidgets=w1,w2&           // Selected widgets for bulk operations
  dashboardLayout=custom&          // CustomDashboard layout mode ⭐ NEW
  
  // Widget-specific state (each widget gets unique prefix)
  widget_abc_page=2&               // ListWidget pagination
  widget_abc_perPage=20&           // Items per page
  widget_abc_filters={"status":"active"}&  // Widget filters
  widget_def_chartType=bar&        // ChartWidget type
  widget_ghi_threshold=80&         // GaugeWidget threshold
  widget_cache_enabled=true&       // Widget cache settings ⭐ NEW
  
  // Global filters (apply to multiple widgets)
  globalFilters={"environment":"prod"}&
  
  // Navigation and selection state
  selectedServers=srv1,srv2,srv3&  // Selected servers across views
  viewMode=rack&                   // Current view mode
  rackVisualization=grid&          // RackVisualization display mode ⭐ NEW
  zoomLevel=1.5&                   // Visualization zoom level ⭐ NEW
  
  // Search and discovery
  serverSearch=hostname123&        // ServerSearch query ⭐ NEW
  searchFilters={"site":"DC1"}&    // Search filter state ⭐ NEW
  searchResults=page2&             // Search pagination ⭐ NEW
  
  // Inventory and management
  inventoryPage=3&                 // ServerInventory pagination
  inventoryFilters={"site":"DC1"}&  // ServerInventory filters
  userMgmtPage=2&                  // UserManagement pagination
  reportParams={"type":"capacity","range":"30d"}&  // Report parameters
  
  // Bulk operations and imports ⭐ NEW
  bulkImportSession=abc123&        // BulkImport session ID
  importStep=mapping&              // Current import step
  importProgress=45&               // Import progress percentage
  
  // Advanced features ⭐ NEW
  filterPreferences=persistent&    // Persistent filter settings
  colorScheme=custom&              // EnumColorManager settings
  enumTheme=dark                   // Color theme preferences
```

### LocalStorage Keys Convention
```typescript
// Form data (auto-save every 5 seconds)
form_serverForm_new         // New server creation form
form_serverForm_edit_123    // Editing server ID 123
form_listWidget_abc_edit    // ListWidget edit dialog
form_chartWidget_def_edit   // ChartWidget edit dialog
form_filterManager_global   // Global filter configuration
form_userManagement_new     // New user creation
form_bulkImport_session_abc // BulkImport session state ⭐ NEW
form_customDashboard_layout // CustomDashboard layout changes ⭐ NEW
form_serverSearch_advanced  // ServerSearch complex queries ⭐ NEW

// Widget state (URL backup)
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

// Persist to URL
useEffect(() => {
  const url = new URL(window.location);
  url.searchParams.set(`${widget.id}_page`, currentPage.toString());
  url.searchParams.set(`${widget.id}_perPage`, itemsPerPage.toString());
  window.history.replaceState({}, '', url.toString());
}, [currentPage, itemsPerPage, widget.id]);

// Restore from URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const savedPage = params.get(`${widget.id}_page`);
  const savedPerPage = params.get(`${widget.id}_perPage`);
  
  if (savedPage) setCurrentPage(parseInt(savedPage));
  if (savedPerPage) setItemsPerPage(parseInt(savedPerPage));
}, [widget.id]);
```

## Testing Strategy

### Manual Testing
1. **Refresh Test**: Navigate to different pages, refresh, verify no redirect to home
2. **State Persistence**: Set filters, paginate, refresh, verify state preserved
3. **Form Recovery**: Fill forms, refresh, verify data restored
4. **Deep Linking**: Copy URLs, open in new tab, verify correct state

### Automated Testing
1. **E2E Tests**: Cypress tests for refresh scenarios
2. **Unit Tests**: URL state management functions
3. **Integration Tests**: LocalStorage persistence

## Rollout Plan

### Phase 1 (Week 1) - Foundation
- **Day 1-2**: Implement URL state for ListWidget ✅ (in progress)
- **Day 3**: Add URL state for ServerInventory (already has pagination)
- **Day 4**: Implement basic routing structure for datacenter hierarchy
- **Day 5**: Test refresh behavior and deploy to development

### Phase 2 (Week 2) - Core Widget State Management
- **Day 1-2**: Extend URL state to all dashboard widgets (Chart, Gauge, Stat, Timeline, Metric)
- **Day 3**: Implement CustomDashboard layout persistence ⭐ NEW
- **Day 4**: Add form auto-save for critical dialogs (ServerForm, EditServerDialog)
- **Day 5**: Add URL state for DataCenterView, FloorView, RoomView, RackView

### Phase 3 (Week 3) - Advanced Features
- **Day 1**: Implement BulkImport session recovery ⭐ NEW
- **Day 2**: Add ServerSearch query and filter persistence ⭐ NEW
- **Day 3**: Implement RackVisualization state management ⭐ NEW
- **Day 4**: Add persistent filter preferences integration ⭐ NEW
- **Day 5**: UserManagement and Reports state persistence

### Phase 4 (Week 4) - Polish and Advanced State
- **Day 1**: Session recovery and crash detection
- **Day 2**: Error boundaries and fallback UI
- **Day 3**: Widget cache configuration persistence ⭐ NEW
- **Day 4**: EnumColorManager preferences integration ⭐ NEW
- **Day 5**: Performance optimization and testing

### Phase 5 (Week 5) - Final Integration and Monitoring ⭐ EXTENDED
- **Day 1-2**: Cross-browser testing and compatibility fixes
- **Day 3**: Integration testing with all new components
- **Day 4**: Documentation and training materials
- **Day 5**: Final validation and rollout completion

## Success Metrics
1. **Zero homepage redirects** on refresh
2. **95% state preservation** across page reloads
3. **No data loss** in forms during crashes
4. **Improved user satisfaction** scores

## Risks & Mitigation
1. **URL Length Limits**: Use compression for large filter objects
2. **Performance Impact**: Debounce URL updates, lazy load state
3. **Browser Compatibility**: Fallback to localStorage for older browsers
4. **State Conflicts**: Clear invalid state on schema changes

## Future Enhancements
1. **Cross-tab Synchronization**: Sync state across browser tabs
2. **Collaborative Editing**: Real-time state sharing
3. **Advanced Recovery**: Time-travel debugging
4. **Analytics**: Track user navigation patterns
