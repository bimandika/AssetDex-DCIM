import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServerInRack {
  id: string;
  hostname: string;
  unit: number;
  unit_height: number;
}

interface AvailableSpace {
  startUnit: number;
  endUnit: number;
  size: number;
}

interface AvailabilityResult {
  available: boolean;
  conflictingServers?: ServerInRack[];
  availableSpaces?: AvailableSpace[];
  suggestion?: {
    position: number;
    reason: string;
  };
}

interface UseRackAvailabilityReturn {
  checkAvailability: (rack: string, position: number, unitHeight: number, excludeServerId?: string) => Promise<AvailabilityResult>;
  loading: boolean;
  error: string | null;
}

export const useRackAvailability = (): UseRackAvailabilityReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async (
    rack: string, 
    position: number, 
    unitHeight: number, 
    excludeServerId?: string
  ): Promise<AvailabilityResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Checking rack availability: ${rack}, U${position}, ${unitHeight}U${excludeServerId ? ` (excluding ${excludeServerId})` : ''}`);

      const { data, error: supabaseError } = await supabase.functions.invoke('check-rack-availability', {
        body: {
          rack,
          position,
          unitHeight,
          excludeServerId
        }
      });

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError);
        throw supabaseError;
      }

      if (data.error) {
        console.error('❌ Function error:', data.error);
        throw new Error(data.error);
      }

      console.log(`✅ Availability check result:`, data);
      return data as AvailabilityResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check rack availability';
      console.error('❌ Error checking rack availability:', errorMessage);
      setError(errorMessage);
      
      // Return a safe default
      return {
        available: false,
        conflictingServers: [],
        availableSpaces: [],
        suggestion: undefined
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkAvailability,
    loading,
    error
  };
};
