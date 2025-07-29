import { useMemo, useEffect } from 'react';
import { usePropertyDefinitions, PropertyDefinition } from './usePropertyDefinitions';
import { useServerEnums } from './useServerEnums';
import { usePersistentFilterPreferences } from './usePersistentFilterPreferences';

export interface FilterableColumn {
  key: string;
  displayName: string;
  options: string[];
  isCore: boolean;
  isAutoDetected?: boolean;
  category?: string;
  enumKey?: string; // For accessing enums data
  preferenceType?: string;
}

// Smart filter eligibility rules
const isFilterWorthy = (property: PropertyDefinition): boolean => {
  // Must be enum/select type
  if (!['enum', 'select'].includes(property.property_type)) return false;
  
  // Must have options
  const options = property.options;
  if (!options || !Array.isArray(options)) return false;
  
  const optionCount = options.length;
  if (optionCount === 0 || optionCount > 50) return false;
  
  // Check exclude patterns
  const excludePatterns = ['_id', '_uuid', '_timestamp', 'note', 'comment', 'description', 'spec'];
  if (excludePatterns.some(pattern => property.key.toLowerCase().includes(pattern))) {
    return false;
  }
  
  return true; // Default to include if passes other checks
};

export const useFilterableColumns = () => {
  const { properties } = usePropertyDefinitions();
  const { enums } = useServerEnums();
  const { 
    preferences, 
    isLoading: preferencesLoading, 
    isFilterEnabled, 
    getPreferenceType,
    processAutoDetectedFilters 
  } = usePersistentFilterPreferences();
  
  const { coreFilters, dynamicFilters, allAvailableFilters } = useMemo(() => {
    // Define core filters (always shown) - matching existing ServerInventory filters
    const coreFilters: FilterableColumn[] = [
      {
        key: 'device_type',
        displayName: 'Device Type',
        options: enums?.deviceTypes || [],
        isCore: true,
        enumKey: 'deviceTypes'
      },
      {
        key: 'environment',
        displayName: 'Environment',
        options: enums?.environmentTypes || [],
        isCore: true,
        enumKey: 'environmentTypes'
      },
      {
        key: 'brand',
        displayName: 'Brand',
        options: enums?.brands || [],
        isCore: true,
        enumKey: 'brands'
      },
      {
        key: 'model',
        displayName: 'Model',
        options: enums?.models || [],
        isCore: true,
        enumKey: 'models'
      },
      {
        key: 'allocation',
        displayName: 'Allocation',
        options: enums?.allocationTypes || [],
        isCore: true,
        enumKey: 'allocationTypes'
      },
      {
        key: 'operating_system',
        displayName: 'Operating System',
        options: enums?.osTypes || [],
        isCore: true,
        enumKey: 'osTypes'
      },
      {
        key: 'dc_site',
        displayName: 'Site',
        options: enums?.sites || [],
        isCore: true,
        enumKey: 'sites'
      },
      {
        key: 'dc_building',
        displayName: 'Building',
        options: enums?.buildings || [],
        isCore: true,
        enumKey: 'buildings'
      },
      {
        key: 'rack',
        displayName: 'Rack',
        options: enums?.racks || [],
        isCore: true,
        enumKey: 'racks'
      },
      {
        key: 'status',
        displayName: 'Status',
        options: enums?.status || [],
        isCore: true,
        enumKey: 'status'
      }
    ];

    // Get core filter keys for exclusion from dynamic filters
    const coreFilterKeys = new Set(coreFilters.map(f => f.key));

    // Smart auto-detection for dynamic filters from property definitions
    const autoDetectedFilters: FilterableColumn[] = properties
      .filter(prop => 
        !coreFilterKeys.has(prop.key) && // Don't duplicate core filters
        isFilterWorthy(prop)
      )
      .map(prop => {
        // For enum columns, try to get values from both property definition and enum context
        let options: string[] = [];
        
        if (prop.property_type === 'enum') {
          // For dynamic enum columns, check if we have enum values in the context
          // Use the column key as the enum key for dynamic columns
          const enumKey = prop.key;
          const enumValues = enums?.[enumKey as keyof typeof enums];
          
          if (Array.isArray(enumValues) && enumValues.length > 0) {
            // Use enum context values (most up-to-date)
            options = enumValues;
          } else if (Array.isArray(prop.options) && prop.options.length > 0) {
            // Fallback to property definition options
            options = prop.options;
          }
        } else if (Array.isArray(prop.options)) {
          // For non-enum types, use property definition options
          options = prop.options;
        }
        
        return {
          key: prop.key,
          displayName: prop.display_name,
          options,
          isCore: false,
          isAutoDetected: true,
          category: prop.category || 'Additional',
          preferenceType: getPreferenceType(prop.key)
        };
      });

    // Filter dynamic filters based on persistent preferences
    const enabledDynamicFilters = autoDetectedFilters.filter(filter => 
      isFilterEnabled(filter.key)
    );

    return {
      coreFilters,
      dynamicFilters: enabledDynamicFilters,
      allAvailableFilters: [...coreFilters, ...autoDetectedFilters]
    };
  }, [properties, enums, preferences, isFilterEnabled, getPreferenceType]);

  // Process auto-detected filters when properties change
  useEffect(() => {
    if (properties.length > 0 && !preferencesLoading) {
      const detectableFilterKeys = properties
        .filter(prop => isFilterWorthy(prop))
        .map(prop => prop.key);
      
      if (detectableFilterKeys.length > 0) {
        processAutoDetectedFilters(detectableFilterKeys);
      }
    }
  }, [properties, preferencesLoading, processAutoDetectedFilters]);

  // Get enabled filters (core + user-enabled dynamic)
  const enabledFilters = useMemo(() => {
    return [...coreFilters, ...dynamicFilters];
  }, [coreFilters, dynamicFilters]);

  return {
    enabledFilters,
    coreFilters,
    dynamicFilters,
    allAvailableFilters,
    isLoading: preferencesLoading,
    refreshPreferences: () => {
      // Trigger refresh by dispatching event
      window.dispatchEvent(new CustomEvent('filterPreferencesUpdated'));
    }
  };
};
