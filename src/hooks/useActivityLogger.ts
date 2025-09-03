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
      ...entry,
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
      await fetch('/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });
    } catch (error) {
      // Optionally handle local fallback
      console.error('Activity log failed', error);
    }
  };

  const logDataOperation = (action: string, resourceType: string, resourceId?: string, details?: any) =>
    logActivity({ category: 'data', action, resourceType, resourceId, details });

  return { logActivity, logDataOperation };
};
