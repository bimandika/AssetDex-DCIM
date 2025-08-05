import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnumColor {
  id: string;
  enum_type: 'allocation_type' | 'model_type';
  enum_value: string;
  color_hex: string;
  color_name?: string;
  user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnumColorMap {
  [enumValue: string]: string; // Maps enum value to hex color
}

export function useEnumColors(enumType?: 'allocation_type' | 'model_type') {
  const [colors, setColors] = useState<EnumColor[]>([]);
  const [colorMap, setColorMap] = useState<EnumColorMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now()); // Force re-render timestamp

  // Fetch colors using Supabase Edge Function
  const fetchColors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found when fetching enum colors');
        setColors([]);
        setColorMap({});
        return;
      }

      const params = new URLSearchParams();
      if (enumType) {
        params.append('enum_type', enumType);
      }

      const { data, error: fetchError } = await supabase.functions.invoke('enum-colors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (fetchError) {
        throw fetchError;
      }

      const enumColors = data?.data || [];
      setColors(enumColors);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Fetched ${enumColors.length} colors for ${enumType}:`, enumColors);
      }
      
      // Create color map for easy lookup
      const map: EnumColorMap = {};
      enumColors.forEach((color: EnumColor) => {
        map[color.enum_value] = color.color_hex;
      });
      setColorMap(map);
      setLastUpdate(Date.now()); // Force re-render by updating timestamp
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Updated colorMap for ${enumType}:`, map);
      }

    } catch (err) {
      console.error('Error fetching enum colors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch colors');
    } finally {
      setLoading(false);
    }
  }, [enumType]);

  // Create or update a color using Supabase Edge Function
  const saveColor = async (
    enumType: 'allocation_type' | 'model_type',
    enumValue: string,
    colorHex: string,
    colorName?: string
  ): Promise<boolean> => {
    try {
      setError(null);

      // Validate hex color format
      if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
        throw new Error('Invalid color format. Expected #RRGGBB');
      }

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please sign in.');
      }

      const { data: saveResponse, error: saveError } = await supabase.functions.invoke('enum-colors', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          enum_type: enumType,
          enum_value: enumValue,
          color_hex: colorHex,
          color_name: colorName
        }
      });

      if (saveError) {
        console.error('🎨 Error saving color:', saveError);
        throw saveError;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎨 Color save response:', saveResponse);
        console.log('🎨 Full save request details:', {
          enumType,
          enumValue,
          colorHex,
          colorName,
          responseData: saveResponse?.data
        });
      }

      // Refresh colors after save
      await fetchColors();
      return true;

    } catch (err) {
      console.error('Error saving enum color:', err);
      setError(err instanceof Error ? err.message : 'Failed to save color');
      return false;
    }
  };

  // Update an existing color using Supabase Edge Function
  const updateColor = async (
    id: string,
    colorHex: string,
    colorName?: string
  ): Promise<boolean> => {
    try {
      setError(null);

      // Validate hex color format
      if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
        throw new Error('Invalid color format. Expected #RRGGBB');
      }

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please sign in.');
      }

      const { error: updateError } = await supabase.functions.invoke('enum-colors', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          id,
          color_hex: colorHex,
          color_name: colorName
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Refresh colors after update
      await fetchColors();
      return true;

    } catch (err) {
      console.error('Error updating enum color:', err);
      setError(err instanceof Error ? err.message : 'Failed to update color');
      return false;
    }
  };

  // Delete a color using Supabase Edge Function
  const deleteColor = async (id: string): Promise<boolean> => {
    try {
      setError(null);

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please sign in.');
      }

      const { error: deleteError } = await supabase.functions.invoke('enum-colors', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { id }
      });

      if (deleteError) {
        throw deleteError;
      }

      // Refresh colors after delete
      await fetchColors();
      return true;

    } catch (err) {
      console.error('Error deleting enum color:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete color');
      return false;
    }
  };

  // Get color for a specific enum value
  const getColor = (enumValue: string): string | undefined => {
    const color = colorMap[enumValue];
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎨 getColor for "${enumValue}" (${enumType}):`, color, 'from colorMap:', colorMap);
    }
    return color;
  };

  // Get all colors for a specific enum type
  const getColorsForType = (type: 'allocation_type' | 'model_type'): EnumColor[] => {
    return colors.filter(color => color.enum_type === type);
  };

  // Generate default colors for enum values that don't have colors
  const generateDefaultColors = async (
    enumType: 'allocation_type' | 'model_type',
    enumValues: string[]
  ): Promise<void> => {
    const existingColors = getColorsForType(enumType);
    const existingValues = new Set(existingColors.map(c => c.enum_value));
    
    // Default color palette
    const defaultColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
    ];

    const missingValues = enumValues.filter(value => !existingValues.has(value));
    
    for (let i = 0; i < missingValues.length; i++) {
      const colorHex = defaultColors[i % defaultColors.length];
      await saveColor(enumType, missingValues[i], colorHex);
    }
  };

  useEffect(() => {
    fetchColors();
    
    // Listen for color updates from other components
    const handleColorUpdate = (event: CustomEvent) => {
      const { enumType: updatedEnumType } = event.detail;
      console.log('🎨 Color update event received for:', updatedEnumType, 'current hook enumType:', enumType);
      
      // Refresh colors if:
      // 1. This hook has no specific enum type (listens to all)
      // 2. The event has no specific enum type (affects all)
      // 3. The enum types match
      if (!enumType || !updatedEnumType || enumType === updatedEnumType) {
        console.log('🎨 Refreshing colors for hook with enumType:', enumType);
        fetchColors();
      } else {
        console.log('🎨 Ignoring color update - enum type mismatch');
      }
    };
    
    window.addEventListener('colorsUpdated', handleColorUpdate as EventListener);
    
    return () => {
      window.removeEventListener('colorsUpdated', handleColorUpdate as EventListener);
    };
  }, [enumType, fetchColors]);

  return {
    colors,
    colorMap,
    loading,
    error,
    lastUpdate, // Include timestamp for components that need to force re-renders
    fetchColors,
    saveColor,
    updateColor,
    deleteColor,
    getColor,
    getColorsForType,
    generateDefaultColors
  };
}
