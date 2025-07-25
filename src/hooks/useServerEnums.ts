import { useEnumContext } from '@/contexts/EnumContext';
import { ServerEnums, defaultServerEnums } from '@/types/enums';

/**
 * Custom hook to fetch and manage server enums from the backend
 * Now uses global enum context for synchronization across components
 * @returns Object containing enums, loading state, error, and refresh function
 */
export const useServerEnums = () => {
  const { enums, loading, error, refreshEnums, addEnumValue } = useEnumContext();

  return { 
    enums, 
    loading, 
    error, 
    addEnumValue,
    refreshEnums 
  };
};