import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PersistentFilterPreference {
  filterKey: string;
  isEnabled: boolean;
  preferenceType: 'user' | 'auto' | 'admin' | 'default';
  isGlobalDefault: boolean;
  globalDefaultEnabled: boolean;
}

export interface FilterPreferenceUpdate {
  filterKey: string;
  enabled: boolean;
  preferenceType?: 'user' | 'auto';
}

export interface AutoEnableResult {
  filterKey: string;
  autoEnabled: boolean;
  reason: string;
}

interface UsePersistentFilterPreferencesReturn {
  preferences: Record<string, PersistentFilterPreference>;
  isLoading: boolean;
  error: string | null;
  updatePreference: (filterKey: string, enabled: boolean, preferenceType?: 'user' | 'auto') => Promise<boolean>;
  processAutoDetectedFilters: (detectedFilterKeys: string[]) => Promise<AutoEnableResult[]>;
  refreshPreferences: () => Promise<void>;
  isFilterEnabled: (filterKey: string) => boolean;
  getPreferenceType: (filterKey: string) => string;
}

export const usePersistentFilterPreferences = (): UsePersistentFilterPreferencesReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Record<string, PersistentFilterPreference>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences from database
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_user_filter_preferences', {
        p_user_id: user.id
      });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const prefsMap = data.reduce((acc, pref) => {
          acc[pref.filter_key] = {
            filterKey: pref.filter_key,
            isEnabled: pref.is_enabled,
            preferenceType: pref.preference_type as any,
            isGlobalDefault: pref.is_global_default,
            globalDefaultEnabled: pref.global_default_enabled
          };
          return acc;
        }, {} as Record<string, PersistentFilterPreference>);

        setPreferences(prefsMap);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filter preferences';
      setError(errorMessage);
      console.error('Error fetching filter preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Update preference in database
  const updatePreference = useCallback(async (
    filterKey: string, 
    enabled: boolean, 
    preferenceType: 'user' | 'auto' = 'user'
  ): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Must be logged in to update filter preferences",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error: updateError } = await supabase.rpc('update_user_filter_preference', {
        p_user_id: user.id,
        p_filter_key: filterKey,
        p_is_enabled: enabled,
        p_preference_type: preferenceType
      });

      if (updateError) {
        throw updateError;
      }

      // Update local state optimistically
      setPreferences(prev => ({
        ...prev,
        [filterKey]: {
          filterKey,
          isEnabled: enabled,
          preferenceType,
          isGlobalDefault: prev[filterKey]?.isGlobalDefault || false,
          globalDefaultEnabled: prev[filterKey]?.globalDefaultEnabled || false
        }
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update filter preference';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  // Process auto-detected filters with smart enabling
  const processAutoDetectedFilters = useCallback(async (
    detectedFilterKeys: string[]
  ): Promise<AutoEnableResult[]> => {
    if (!user?.id || !detectedFilterKeys.length) {
      return [];
    }

    try {
      const { data, error: processError } = await supabase.rpc('auto_enable_filters_for_user', {
        p_user_id: user.id,
        p_detected_filters: detectedFilterKeys
      });

      if (processError) {
        throw processError;
      }

      const results: AutoEnableResult[] = data || [];
      
      // Show notifications for auto-enabled filters
      const autoEnabledFilters = results.filter(r => r.autoEnabled);
      if (autoEnabledFilters.length > 0) {
        toast({
          title: "Filters Auto-Enabled",
          description: `${autoEnabledFilters.length} new filter(s) have been automatically enabled: ${autoEnabledFilters.map(f => f.filterKey).join(', ')}`,
          duration: 5000
        });
      }

      // Refresh preferences to get updated state
      await fetchPreferences();

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process auto-detected filters';
      setError(errorMessage);
      console.error('Error processing auto-detected filters:', err);
      return [];
    }
  }, [user?.id, toast, fetchPreferences]);

  // Helper to check if a filter is enabled
  const isFilterEnabled = useCallback((filterKey: string): boolean => {
    return preferences[filterKey]?.isEnabled || false;
  }, [preferences]);

  // Helper to get preference type
  const getPreferenceType = useCallback((filterKey: string): string => {
    return preferences[filterKey]?.preferenceType || 'default';
  }, [preferences]);

  // Refresh preferences (exposed for external triggers)
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Listen for preference updates from other components
  useEffect(() => {
    const handleFilterPreferencesUpdated = () => {
      fetchPreferences();
    };

    window.addEventListener('filterPreferencesUpdated', handleFilterPreferencesUpdated);
    return () => {
      window.removeEventListener('filterPreferencesUpdated', handleFilterPreferencesUpdated);
    };
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    processAutoDetectedFilters,
    refreshPreferences,
    isFilterEnabled,
    getPreferenceType
  };
};
