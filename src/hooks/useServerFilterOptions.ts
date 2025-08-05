import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ServerFilterOptions, HierarchicalFilterState } from '@/types/filterTypes'
import { useServerEnums } from '@/hooks/useServerEnums'

export const useServerFilterOptions = () => {
  const [filterOptions, setFilterOptions] = useState<ServerFilterOptions>({
    models: [],
    dc_sites: [],
    dc_buildings: [],
    dc_floors: [],
    dc_rooms: [],
    allocations: [],
    environments: [],
    status: [],
    device_types: [],
    brands: []
  })
  
  const [hierarchicalState, setHierarchicalState] = useState<HierarchicalFilterState>({
    availableBuildings: [],
    availableFloors: [],
    availableRooms: []
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { enums } = useServerEnums()

  // Fetch all unique values from servers table
  const fetchFilterOptions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch unique values for each filter field
      const [
        { data: models },
        { data: sites },
        { data: buildings },
        { data: floors },
        { data: rooms },
        { data: brands }
      ] = await Promise.all([
        supabase.from('servers').select('model').not('model', 'is', null),
        supabase.from('servers').select('dc_site').not('dc_site', 'is', null),
        supabase.from('servers').select('dc_building').not('dc_building', 'is', null),
        supabase.from('servers').select('dc_floor').not('dc_floor', 'is', null),
        supabase.from('servers').select('dc_room').not('dc_room', 'is', null),
        supabase.from('servers').select('brand').not('brand', 'is', null)
      ])

      // Extract unique values
      const getUnique = (arr: any[], key: string) => 
        [...new Set(arr?.map(item => item[key]).filter(Boolean) || [])]

      const newFilterOptions: ServerFilterOptions = {
        models: getUnique(models || [], 'model'),
        dc_sites: getUnique(sites || [], 'dc_site'),
        dc_buildings: getUnique(buildings || [], 'dc_building'),
        dc_floors: getUnique(floors || [], 'dc_floor'),
        dc_rooms: getUnique(rooms || [], 'dc_room'),
        brands: getUnique(brands || [], 'brand'),
        // Use enums for these fields
        allocations: enums?.allocationTypes || [],
        environments: enums?.environmentTypes || [],
        status: enums?.status || [],
        device_types: enums?.deviceTypes || []
      }

      setFilterOptions(newFilterOptions)
      
      // Initialize hierarchical state with all buildings available
      setHierarchicalState({
        availableBuildings: newFilterOptions.dc_buildings,
        availableFloors: newFilterOptions.dc_floors,
        availableRooms: newFilterOptions.dc_rooms
      })
      
    } catch (err) {
      console.error('Error fetching filter options:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch filter options')
    } finally {
      setIsLoading(false)
    }
  }, [enums])

  // Update hierarchical filters based on selections
  const updateHierarchicalFilters = useCallback(async (
    selectedSite?: string,
    selectedBuilding?: string,
    selectedFloor?: string
  ) => {
    try {
      let availableBuildings = filterOptions.dc_buildings
      let availableFloors = filterOptions.dc_floors
      let availableRooms = filterOptions.dc_rooms

      // Filter buildings based on selected site
      if (selectedSite) {
        const { data: buildings } = await supabase
          .from('servers')
          .select('dc_building')
          .eq('dc_site', selectedSite)
          .not('dc_building', 'is', null)
        
        availableBuildings = [...new Set(buildings?.map(b => b.dc_building).filter(Boolean) || [])]
      }

      // Filter floors based on selected site and building
      if (selectedSite && selectedBuilding) {
        const { data: floors } = await supabase
          .from('servers')
          .select('dc_floor')
          .eq('dc_site', selectedSite)
          .eq('dc_building', selectedBuilding)
          .not('dc_floor', 'is', null)
        
        availableFloors = [...new Set(floors?.map(f => f.dc_floor).filter(Boolean) || [])]
      }

      // Filter rooms based on selected site, building, and floor
      if (selectedSite && selectedBuilding && selectedFloor) {
        const { data: rooms } = await supabase
          .from('servers')
          .select('dc_room')
          .eq('dc_site', selectedSite)
          .eq('dc_building', selectedBuilding)
          .eq('dc_floor', selectedFloor)
          .not('dc_room', 'is', null)
        
        availableRooms = [...new Set(rooms?.map(r => r.dc_room).filter(Boolean) || [])]
      }

      setHierarchicalState({
        selectedSite,
        availableBuildings,
        selectedBuilding,
        availableFloors,
        selectedFloor,
        availableRooms
      })

    } catch (err) {
      console.error('Error updating hierarchical filters:', err)
    }
  }, [filterOptions])

  // Validate filter configuration and get result count
  const validateFilters = useCallback(async (filters: any) => {
    try {
      // Build query based on filters
      let query = supabase.from('servers').select('id', { count: 'exact' })

      // Apply filters
      if (filters.models?.length) {
        query = query.in('model', filters.models)
      }
      if (filters.dc_sites?.length) {
        query = query.in('dc_site', filters.dc_sites)
      }
      if (filters.dc_buildings?.length) {
        query = query.in('dc_building', filters.dc_buildings)
      }
      if (filters.dc_floors?.length) {
        query = query.in('dc_floor', filters.dc_floors)
      }
      if (filters.dc_rooms?.length) {
        query = query.in('dc_room', filters.dc_rooms)
      }
      if (filters.allocations?.length) {
        query = query.in('allocation', filters.allocations)
      }
      if (filters.environments?.length) {
        query = query.in('environment', filters.environments)
      }
      if (filters.status?.length) {
        query = query.in('status', filters.status)
      }
      if (filters.device_types?.length) {
        query = query.in('device_type', filters.device_types)
      }
      if (filters.brands?.length) {
        query = query.in('brand', filters.brands)
      }

      const { count, error } = await query

      if (error) throw error

      return {
        isValid: true,
        errors: [],
        warnings: count === 0 ? ['No servers match the selected filters'] : [],
        resultCount: count || 0
      }

    } catch (err) {
      return {
        isValid: false,
        errors: [err instanceof Error ? err.message : 'Filter validation failed'],
        warnings: [],
        resultCount: 0
      }
    }
  }, [])

  // Load filter options on mount and when enums change
  useEffect(() => {
    if (enums) {
      fetchFilterOptions()
    }
  }, [enums, fetchFilterOptions])

  return {
    filterOptions,
    hierarchicalState,
    isLoading,
    error,
    updateHierarchicalFilters,
    validateFilters,
    refetch: fetchFilterOptions
  }
}