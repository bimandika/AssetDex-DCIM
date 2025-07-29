import { supabase } from '@/integrations/supabase/client';

export interface FilterSyncResult {
  filterKey: string;
  action: 'auto_enabled' | 'available';
  reason: string;
}

/**
 * Syncs newly detected enum columns with global filter defaults
 * This should be called when the app loads to ensure all enum columns
 * are available as potential filters
 */
export const syncEnumColumnsToFilterDefaults = async (): Promise<FilterSyncResult[]> => {
  try {
    const { data, error } = await supabase.rpc('sync_enum_columns_to_filter_defaults');
    
    if (error) {
      console.error('Error syncing enum columns to filter defaults:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to sync enum columns:', err);
    return [];
  }
};

/**
 * Gets all available filter defaults from the database
 */
export const getGlobalFilterDefaults = async () => {
  try {
    const { data, error } = await supabase.rpc('get_global_filter_defaults');
    
    if (error) {
      console.error('Error fetching global filter defaults:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to fetch global filter defaults:', err);
    return [];
  }
};

/**
 * Initializes filter system for the app
 * Call this once when the app loads
 */
export const initializeFilterSystem = async (): Promise<void> => {
  try {
    // Sync enum columns to filter defaults
    const syncResults = await syncEnumColumnsToFilterDefaults();
    
    if (syncResults.length > 0) {
      console.log('Filter system initialized:', syncResults);
    }
  } catch (err) {
    console.error('Failed to initialize filter system:', err);
  }
};
