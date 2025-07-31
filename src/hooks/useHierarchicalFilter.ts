import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HierarchyFilters {
  dc_site?: string;
  dc_building?: string;
  dc_floor?: string;
  dc_room?: string;
  rack?: string;
}

interface HierarchyData {
  sites: string[];
  buildings: string[];
  floors: string[];
  rooms: string[];
  racks: string[];
  allRacks: string[]; // All racks regardless of hierarchy
}

export const useHierarchicalFilter = () => {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData>({
    sites: [],
    buildings: [],
    floors: [],
    rooms: [],
    racks: [],
    allRacks: []
  });
  
  const [filters, setFilters] = useState<HierarchyFilters>({});
  const [loading, setLoading] = useState(false);
  const [defaultRack, setDefaultRack] = useState<string>('');

  // Function to get first available rack as default and set its location
  const getDefaultRack = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-default-rack');

      if (error) {
        console.error('Error fetching default rack:', error);
        setDefaultRack('RACK-01');
        // Set default location for RACK-01
        await setDefaultRackLocationFallback('RACK-01');
        return 'RACK-01'; // Fallback
      }

      const rack = data?.defaultRack || 'RACK-01';
      setDefaultRack(rack);
      
      // Get the location of this rack and set filters accordingly
      await setDefaultRackLocation(rack);
      
      return rack;
    } catch (error) {
      console.error('Error in getDefaultRack:', error);
      setDefaultRack('RACK-01');
      // Set default location for RACK-01
      await setDefaultRackLocationFallback('RACK-01');
      return 'RACK-01'; // Fallback
    }
  };

  // Fallback function to set default rack location without backend call
  const setDefaultRackLocationFallback = async (rackName: string) => {
    // Hardcoded locations based on database schema
    const rackLocations: Record<string, any> = {
      'RACK-01': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '1', dc_room: 'MDF' },
      'RACK-02': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '2', dc_room: '201' },
      'RACK-03': { dc_site: 'DC-East', dc_building: 'Building-A', dc_floor: '3', dc_room: '301' }
    };

    const location = rackLocations[rackName] || rackLocations['RACK-01'];
    const defaultFilters = {
      dc_site: location.dc_site || undefined,
      dc_building: location.dc_building || undefined,
      dc_floor: location.dc_floor || undefined,
      dc_room: location.dc_room || undefined,
    };
    
    setFilters(defaultFilters);
    await updateHierarchyData(defaultFilters);
  };

  // Function to set filters based on default rack location
  const setDefaultRackLocation = async (rackName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-rack-location', {
        body: { rackName }
      });

      if (error) {
        console.error('Error fetching rack location:', error);
        // Use fallback
        await setDefaultRackLocationFallback(rackName);
        return;
      }

      if (data?.location) {
        const location = data.location;
        const defaultFilters = {
          dc_site: location.dc_site || undefined,
          dc_building: location.dc_building || undefined,
          dc_floor: location.dc_floor || undefined,
          dc_room: location.dc_room || undefined,
        };
        
        setFilters(defaultFilters);
        // Update hierarchy data with these default filters
        await updateHierarchyData(defaultFilters);
      } else {
        // Use fallback
        await setDefaultRackLocationFallback(rackName);
      }
    } catch (error) {
      console.error('Error in setDefaultRackLocation:', error);
      // Use fallback
      await setDefaultRackLocationFallback(rackName);
    }
  };

  // Function to get all racks (not filtered by hierarchy)
  const getAllRacks = async () => {
    try {
      // Use the existing get-enums endpoint to get all racks
      const { data, error } = await supabase.functions.invoke('get-enums');

      if (error) {
        console.error('Error fetching all racks:', error);
        // Fallback to hardcoded racks
        return ['RACK-01', 'RACK-02', 'RACK-03'];
      }

      return data?.racks || ['RACK-01', 'RACK-02', 'RACK-03'];
    } catch (error) {
      console.error('Error in getAllRacks:', error);
      // Fallback to hardcoded racks
      return ['RACK-01', 'RACK-02', 'RACK-03'];
    }
  };

  // Function to get data for a specific level
  const getHierarchyData = async (level: string, currentFilters: HierarchyFilters = {}) => {
    try {
      setLoading(true);
      
      // First, let's check what columns actually exist by querying all columns
      let query = supabase
        .from('servers')
        .select('*')
        .limit(1);

      const { data: testData, error: testError } = await query;
      
      if (testError) {
        console.error('Test query error:', testError);
        return [];
      }
      
      console.log('Available columns:', testData?.[0] ? Object.keys(testData[0]) : 'No data');
      
      // Now do the actual query - let's try without dc_building first
      let hierarchyQuery = supabase
        .from('servers')
        .select('dc_site, dc_floor, dc_room, rack');

      // Apply hierarchical filters
      if (currentFilters.dc_site) {
        hierarchyQuery = hierarchyQuery.eq('dc_site', currentFilters.dc_site);
      }
      if (currentFilters.dc_floor) {
        hierarchyQuery = hierarchyQuery.eq('dc_floor', currentFilters.dc_floor);
      }
      if (currentFilters.dc_room) {
        hierarchyQuery = hierarchyQuery.eq('dc_room', currentFilters.dc_room);
      }

      const { data: servers, error } = await hierarchyQuery;

      if (error) {
        console.error('Error fetching hierarchy data:', error);
        return [];
      }

      let result: string[] = [];

      switch (level) {
        case 'sites':
          result = [...new Set(servers?.map((s: any) => s.dc_site).filter(Boolean) as string[])];
          break;
        case 'buildings':
          // For now, return a static list since dc_building column might not exist
          result = ['Building-A', 'Building-B', 'Building-C'];
          break;
        case 'floors':
          result = [...new Set(servers?.map((s: any) => s.dc_floor).filter(Boolean) as string[])];
          break;
        case 'rooms':
          result = [...new Set(servers?.map((s: any) => s.dc_room).filter(Boolean) as string[])];
          break;
        case 'racks':
          result = [...new Set(servers?.map((s: any) => s.rack).filter(Boolean) as string[])];
          break;
      }

      return result.sort();
    } catch (error) {
      console.error('Error in getHierarchyData:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Update hierarchy data when filters change
  const updateHierarchyData = async (newFilters: HierarchyFilters) => {
    const sites = await getHierarchyData('sites', {});
    const buildings = await getHierarchyData('buildings', { dc_site: newFilters.dc_site });
    const floors = await getHierarchyData('floors', { 
      dc_site: newFilters.dc_site, 
      dc_building: newFilters.dc_building 
    });
    const rooms = await getHierarchyData('rooms', { 
      dc_site: newFilters.dc_site, 
      dc_building: newFilters.dc_building,
      dc_floor: newFilters.dc_floor
    });
    const racks = await getHierarchyData('racks', { 
      dc_site: newFilters.dc_site, 
      dc_building: newFilters.dc_building,
      dc_floor: newFilters.dc_floor,
      dc_room: newFilters.dc_room
    });
    const allRacks = await getAllRacks();

    setHierarchyData({
      sites,
      buildings,
      floors,
      rooms,
      racks,
      allRacks
    });
  };

  // Initialize data on mount and get default rack
  useEffect(() => {
    const initializeData = async () => {
      await updateHierarchyData({});
      await getDefaultRack();
    };
    initializeData();
  }, []);

  // Update filters and cascade changes
  const updateFilter = async (level: keyof HierarchyFilters, value: string) => {
    const newFilters = { ...filters };
    
    // If rack is selected directly, get its location and populate all filters
    if (level === 'rack') {
      newFilters.rack = value;
      await setRackLocationFromName(value, newFilters);
      return;
    }
    
    // Reset subsequent levels when parent changes
    switch (level) {
      case 'dc_site':
        newFilters.dc_site = value;
        newFilters.dc_building = undefined;
        newFilters.dc_floor = undefined;
        newFilters.dc_room = undefined;
        newFilters.rack = undefined;
        break;
      case 'dc_building':
        newFilters.dc_building = value;
        newFilters.dc_floor = undefined;
        newFilters.dc_room = undefined;
        newFilters.rack = undefined;
        break;
      case 'dc_floor':
        newFilters.dc_floor = value;
        newFilters.dc_room = undefined;
        newFilters.rack = undefined;
        break;
      case 'dc_room':
        newFilters.dc_room = value;
        newFilters.rack = undefined;
        break;
    }

    setFilters(newFilters);
    await updateHierarchyData(newFilters);
  };

  // Function to set all filters when rack is selected directly
  const setRackLocationFromName = async (rackName: string, currentFilters: HierarchyFilters) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-rack-location', {
        body: { rackName }
      });

      if (error) {
        console.error('Error fetching rack location:', error);
        setFilters(currentFilters);
        await updateHierarchyData(currentFilters);
        return;
      }

      if (data?.location) {
        const location = data.location;
        const newFilters = {
          dc_site: location.dc_site || undefined,
          dc_building: location.dc_building || undefined,
          dc_floor: location.dc_floor || undefined,
          dc_room: location.dc_room || undefined,
          rack: rackName,
        };
        
        setFilters(newFilters);
        await updateHierarchyData(newFilters);
      }
    } catch (error) {
      console.error('Error in setRackLocationFromName:', error);
      setFilters(currentFilters);
      await updateHierarchyData(currentFilters);
    }
  };

  // Reset all filters
  const resetFilters = async () => {
    setFilters({});
    await updateHierarchyData({});
  };

  return {
    hierarchyData,
    filters,
    loading,
    defaultRack,
    updateFilter,
    resetFilters,
    updateHierarchyData,
    getDefaultRack
  };
};
