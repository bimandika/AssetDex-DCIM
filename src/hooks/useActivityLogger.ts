// Activity logging hook for frontend
import { useAuth } from './useAuth'

export interface ActivityLogEntry {
  category: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: string;
  tags?: string[];
}

export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = async (entry: ActivityLogEntry) => {
    const activityData = {
      category: entry.category,
      action: entry.action,
      resource_type: entry.resourceType, // Map camelCase to snake_case
      resource_id: entry.resourceId,     // Map camelCase to snake_case
      details: entry.details,
      severity: entry.severity,
      tags: entry.tags,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
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
    
    try {
      // Use direct fetch instead of supabase.functions.invoke for consistency
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      console.log('Logging activity:', entry.action, 'with token:', token ? 'Present' : 'Missing');
      console.log('Activity data:', activityData);
      
      const response = await fetch('http://localhost:8000/functions/v1/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(activityData)
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      console.log('Activity logged successfully:', entry.action);
    } catch (error) {
      // Optionally handle local fallback
      console.error('Activity log failed', error);
      throw error; // Re-throw so the UI can handle it
    }
  };

  const logDataOperation = (action: string, resourceType: string, resourceId?: string, details?: any) =>
    logActivity({ category: 'data', action, resourceType, resourceId, details });

  return { logActivity, logDataOperation };
};
