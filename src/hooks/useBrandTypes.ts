import { useEnumContext } from '../contexts/EnumContext';

export interface BrandType {
  name: string;
}

export const useBrandTypes = () => {
  const { enums, loading, error } = useEnumContext();

  return { 
    brands: enums.brands || [], 
    loading, 
    error 
  };
};

export const useModelTypes = () => {
  const { enums, loading, error } = useEnumContext();

  return { 
    models: enums.models || [], 
    loading, 
    error 
  };
};

// Combined hook for device form data
export const useDeviceEnums = () => {
  const { enums, loading, error } = useEnumContext();

  return { 
    brands: enums.brands || [], 
    models: enums.models || [],
    deviceTypes: enums.deviceTypes || [],
    loading, 
    error 
  };
};
