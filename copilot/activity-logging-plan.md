# Activity Logging System - Data Change Tracking

## Overview
Implement a focused activity logging system to track all data changes within the DCIM application for audit trails, compliance, and accountability purposes.

## Goals
1. **Data Change Audit Trail**: Track who changed what data and when
2. **Compliance**: Meet regulatory requirements for data modifications
3. **Accountability**: Know who is responsible for each data change
4. **Debugging**: Assist in troubleshooting data-related issues
5. **Change History**: Maintain complete history of asset modifications

## Activity Categories

### Data Operations (CRUD)
- **Server changes**: Creation, updates, deletions, property modifications
- **Rack changes**: Rack assignments, capacity updates, location changes  
- **Asset modifications**: Hardware updates, status changes, allocations
- **Configuration changes**: System settings, property definitions
- **User management**: User creation, role changes, permission updates
- **Dashboard modifications**: Widget creation, configuration changes

## Technical Implementation

### Database Schema

#### Primary Log Table
```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Activity Classification
    category TEXT NOT NULL, -- 'data'
    action TEXT NOT NULL,   -- 'create', 'update', 'delete'
    resource_type TEXT,     -- 'server', 'dashboard', 'user', 'rack', etc.
    resource_id TEXT,       -- ID of the affected resource
    
    -- Context and Details
    details JSONB,          -- Flexible structure for activity-specific data
    metadata JSONB,         -- Additional context (browser, device, location)
    
    -- Request/Response Info
    request_method TEXT,    -- GET, POST, PUT, DELETE
    request_url TEXT,       -- Full request URL
    request_body JSONB,     -- Request payload (sanitized)
    response_status INTEGER, -- HTTP status code
    response_time_ms INTEGER, -- Response time in milliseconds
    
    -- Security and Tracking
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    tags TEXT[],            -- Searchable tags
    correlation_id TEXT,    -- Link related activities
    
    -- Indexing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_category_action ON activity_logs(category, action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX idx_activity_logs_tags ON activity_logs USING GIN(tags);
CREATE INDEX idx_activity_logs_details ON activity_logs USING GIN(details);
```

#### Aggregated Metrics Table
```sql
CREATE TABLE activity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    hour INTEGER, -- 0-23 for hourly metrics
    user_id UUID REFERENCES auth.users(id),
    
    -- Metrics
    total_activities INTEGER DEFAULT 0,
    unique_resources_accessed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL,
    
    -- Activity breakdown
    data_activities INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, hour, user_id)
);
```

### Frontend Activity Tracking

#### Activity Logger Hook
```typescript
// hooks/useActivityLogger.ts
import { useAuth } from '@/hooks/useAuth';

interface ActivityLogEntry {
  category: 'data';
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  tags?: string[];
}

export const useActivityLogger = () => {
  const { user } = useAuth();
  
  const logActivity = async (entry: ActivityLogEntry) => {
    const activityData = {
      ...entry,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        ...entry.metadata,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        referrer: document.referrer,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Send to backend
    try {
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });
    } catch (error) {
      // Fallback to local storage if API fails
      storeLocalActivity(activityData);
    }
  };
  
  // Convenience methods
  const logDataOperation = (action: string, resourceType: string, resourceId?: string, details?: any) =>
    logActivity({ category: 'data', action, resourceType, resourceId, details });
  
  const logError = (error: Error, context?: any) =>
    logActivity({ 
      category: 'data', 
      action: 'error', 
      details: { error: error.message, stack: error.stack, context },
      severity: 'error'
    });
  
  return { logActivity, logDataOperation, logError };
};
```

#### Automatic Activity Tracking

##### Form Interaction Tracking
```typescript
// hooks/useFormActivityTracking.ts
export const useFormActivityTracking = (formId: string, formType: string) => {
  const { logDataOperation } = useActivityLogger();
  
  const trackFormStart = () => {
    logDataOperation('form_start', formType, formId, {
      formId,
      timestamp: Date.now()
    });
  };
  
  const trackFormSubmit = (data: any, success: boolean) => {
    logDataOperation('form_submit', formType, formId, {
      formId,
      success,
      fieldCount: Object.keys(data).length,
      // Don't log sensitive data
      hasPassword: 'password' in data,
      hasEmail: 'email' in data
    });
  };
  
  const trackFormAbandon = (filledFields: string[]) => {
    logDataOperation('form_abandon', formType, formId, {
      formId,
      filledFieldCount: filledFields.length,
      filledFields: filledFields
    });
  };
  
  return { trackFormStart, trackFormSubmit, trackFormAbandon };
};
```

##### API Call Tracking (Critical Errors Only)
```typescript
// lib/api/activityMiddleware.ts
export const activityLoggingMiddleware = (logActivity: Function) => {
  return (originalFetch: typeof fetch) => {
    return async (url: string, options: RequestInit = {}) => {
      const startTime = Date.now();
      const method = options.method || 'GET';
      
      try {
        const response = await originalFetch(url, options);
        
        // Only log critical failures
        if (!response.ok && response.status >= 500) {
          const endTime = Date.now();
          logActivity({
            category: 'data',
            action: 'api_error',
            details: {
              url,
              method,
              status: response.status,
              responseTimeMs: endTime - startTime
            },
            severity: 'error'
          });
        }
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        
        logActivity({
          category: 'data',
          action: 'api_error',
          details: {
            url,
            method,
            error: error.message,
            responseTimeMs: endTime - startTime
          },
          severity: 'error'
        });
        
        throw error;
      }
    };
  };
};
```

### Backend Implementation

#### Activity Logging Service
```typescript
// services/ActivityLoggingService.ts
interface LogActivityParams {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  category: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  metadata?: any;
  requestMethod?: string;
  requestUrl?: string;
  requestBody?: any;
  responseStatus?: number;
  responseTimeMs?: number;
  severity?: string;
  tags?: string[];
}

export class ActivityLoggingService {
  async logActivity(params: LogActivityParams) {
    const activityLog = {
      ...params,
      timestamp: new Date(),
      correlationId: generateCorrelationId(),
      // Sanitize sensitive data
      requestBody: this.sanitizeData(params.requestBody),
      details: this.sanitizeData(params.details)
    };
    
    // Insert into database
    await this.insertActivityLog(activityLog);
    
    // Real-time notifications for critical events
    if (params.severity === 'critical') {
      await this.sendRealTimeAlert(activityLog);
    }
    
    // Update metrics
    await this.updateActivityMetrics(activityLog);
  }
  
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'];
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  async getActivityLogs(filters: {
    userId?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    severity?: string;
    limit?: number;
    offset?: number;
  }) {
    // Build query with filters
    // Return paginated results
  }
  
  async getActivityMetrics(params: {
    dateFrom: Date;
    dateTo: Date;
    groupBy: 'hour' | 'day' | 'week';
    userId?: string;
  }) {
    // Return aggregated metrics
  }
}
```

#### Database Triggers for Automatic Logging
```sql
-- Function to log data changes
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (
        user_id,
        category,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        auth.uid(),
        'data',
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        jsonb_build_object(
            'old_values', to_jsonb(OLD),
            'new_values', to_jsonb(NEW),
            'changed_fields', (
                SELECT array_agg(key)
                FROM jsonb_each(to_jsonb(NEW))
                WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key
            )
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to important tables
CREATE TRIGGER servers_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON servers
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER users_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER dashboard_widgets_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();
```

## Files to Modify/Create

### New Files to Create
```
src/hooks/
  ├── useActivityLogger.ts          # Main activity logging hook
  ├── useFormActivityTracking.ts    # Form interaction tracking
  └── useErrorTracking.ts           # Critical error tracking

src/components/
  ├── ErrorBoundaryWithLogging.tsx  # Error boundary with logging
  └── CriticalErrorTracker.tsx      # Track only critical system errors

src/lib/api/
  ├── activityMiddleware.ts         # API error logging (critical only)
  └── activityLogger.ts             # Core logging utilities

src/services/
  └── ActivityLoggingService.ts     # Backend logging service

src/components/admin/
  ├── DataChangeLogsViewer.tsx      # Admin interface for viewing data changes
  ├── DataChangeMetrics.tsx         # Data modification analytics dashboard
  └── AssetChangeHistory.tsx        # Asset-specific change history viewer

database/
  ├── data-change-logs-schema.sql   # Database schema for data change logging
  └── data-change-triggers.sql      # Database triggers for auto-logging data changes
```

### Existing Files to Modify
```
src/App.tsx                        # Add error boundary for data operation failures
src/main.tsx                       # Setup data change logging middleware
src/components/forms/ServerForm.tsx # Add server data change tracking
src/components/EditServerDialog.tsx # Add server edit logging
src/components/ServerInventory.tsx  # Add bulk operation logging
src/components/UserManagement.tsx   # Add user data change logging
src/components/RackView.tsx         # Add rack assignment logging
src/components/DataCenterView.tsx   # Add asset movement logging
All form components                # Add data modification logging
All dialog components              # Add CRUD operation logging
```

## Activity Logging Examples

### Server Operations
```typescript
// Server creation
logDataOperation('create', 'server', serverId, {
  hostname: serverData.hostname,
  rack: serverData.rack,
  environment: serverData.environment,
  createdBy: user.id
});

// Server update
logDataOperation('update', 'server', serverId, {
  changedFields: ['status', 'allocation'],
  oldValues: { status: 'active', allocation: null },
  newValues: { status: 'maintenance', allocation: 'project-x' },
  updatedBy: user.id
});

// Server deletion
logDataOperation('delete', 'server', serverId, {
  hostname: serverData.hostname,
  reason: 'decommissioned',
  deletedBy: user.id
});
```

### Rack Operations
```typescript
// Rack assignment
logDataOperation('update', 'rack', rackId, {
  action: 'server_assignment',
  serverId: server.id,
  unit: rackUnit,
  previousServer: previousServerId,
  assignedBy: user.id
});

// Rack capacity update
logDataOperation('update', 'rack', rackId, {
  action: 'capacity_change',
  oldCapacity: 42,
  newCapacity: 48,
  reason: 'hardware_upgrade',
  updatedBy: user.id
});
```

### Asset Management
```typescript
// Asset property change
logDataOperation('update', 'server', serverId, {
  propertyType: 'hardware_spec',
  changedFields: ['memory', 'cpu'],
  oldValues: { memory: '32GB', cpu: 'Intel Xeon E5' },
  newValues: { memory: '64GB', cpu: 'Intel Xeon Gold' },
  changeReason: 'hardware_upgrade',
  updatedBy: user.id
});

// Asset location change
logDataOperation('update', 'server', serverId, {
  action: 'location_change',
  oldLocation: { site: 'DC1', rack: 'R01', unit: 10 },
  newLocation: { site: 'DC2', rack: 'R05', unit: 15 },
  moveReason: 'capacity_optimization',
  movedBy: user.id
});
```

### Configuration Changes
```typescript
// Dashboard widget modification
logDataOperation('update', 'dashboard_widget', widgetId, {
  widgetType: 'list',
  configChanges: ['columns', 'filters'],
  oldConfig: oldConfig,
  newConfig: newConfig,
  modifiedBy: user.id
});

// System property definition change
logDataOperation('update', 'property_definition', propertyId, {
  propertyName: 'server_environment',
  changedFields: ['options'],
  oldOptions: ['prod', 'staging', 'dev'],
  newOptions: ['production', 'staging', 'development', 'testing'],
  updatedBy: user.id
});
```

## Security and Privacy

### Data Sanitization
- Remove sensitive information (passwords, tokens, personal data)
- Hash or encrypt identifiable information when necessary
- Implement data retention policies
- Provide user data export/deletion capabilities

### Access Control
- Restrict activity log access to authorized administrators
- Implement role-based viewing permissions
- Audit access to activity logs themselves
- Secure log storage and transmission

### Compliance
- GDPR compliance for EU users
- SOX compliance for financial data
- HIPAA compliance if handling health data
- Industry-specific regulatory requirements

## Monitoring and Alerting

### Real-time Alerts
```typescript
// Data integrity alerts (High Priority)
- Bulk data operations (>10 records)
- Critical asset deletions
- Unauthorized data modifications
- Data corruption or inconsistencies

// Asset management alerts (Medium Priority)
- High-value server modifications
- Rack capacity threshold breaches
- Asset location changes
- Configuration drift detection
```

### Analytics Dashboard
```typescript
// Key metrics to track (Data-focused)
- Daily data modification counts
- Most frequently changed assets
- User activity patterns (who changes what)
- Data change trends over time
- Asset lifecycle tracking
- Change frequency by asset type
```

## Implementation Timeline

### Phase 1 (Week 1) - Foundation
- Set up database schema
- Create core logging hooks and services
- Implement basic activity tracking

### Phase 2 (Week 2) - Frontend Integration
- Add activity tracking to all major components
- Implement form and navigation tracking
- Set up error boundary logging

### Phase 3 (Week 3) - Backend & Security
- Implement backend logging service
- Add database triggers
- Set up security monitoring

### Phase 4 (Week 4) - Analytics & Monitoring
- Create admin dashboard for viewing logs
- Implement real-time alerts
- Set up performance monitoring

### Phase 5 (Week 5) - Testing & Optimization
- Performance testing and optimization
- Security audit and compliance review
- Documentation and training

## Success Metrics
1. **Coverage**: 100% of data modifications logged
2. **Performance**: <2ms impact on data operations
3. **Reliability**: 99.9% logging success rate
4. **Completeness**: Full audit trail for all asset changes
5. **Compliance**: Pass all data governance audits
6. **Traceability**: Complete change history for every asset
