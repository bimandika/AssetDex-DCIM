import { ServerStatus, DeviceType, EnvironmentType, AllocationType } from '@/types/enums'

// Enhanced filter configuration for complex server filtering
export interface ServerFilterConfig {
  // Model filtering
  models?: string[]
  
  // Data Center hierarchy filtering
  dc_sites?: string[]
  dc_buildings?: string[]
  dc_floors?: string[]
  dc_rooms?: string[]
  
  // Allocation filtering
  allocations?: AllocationType[]
  
  // Environment filtering
  environments?: EnvironmentType[]
  
  // Additional server filters
  status?: ServerStatus[]
  device_types?: DeviceType[]
  brands?: string[]
  
  // Filter logic
  logic?: 'AND' | 'OR'
  
  // Enable hierarchical filtering (selecting site filters buildings, etc.)
  hierarchical_filtering?: boolean
}

// Extended filter configuration that includes both basic and server-specific filters
export interface EnhancedFilterConfig {
  field: string
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'not_equals' | 'not_in'
  value: string | string[] | number
  logic?: 'AND' | 'OR'
}

// Server-specific data source configuration
export interface ServerDataSourceConfig {
  table: 'servers'
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  groupBy?: string
  serverFilters?: ServerFilterConfig
  basicFilters?: EnhancedFilterConfig[]
  dateRange?: {
    field: string
    start: string
    end: string
  }
}

// Enhanced query configuration that supports both basic and server filtering
export interface EnhancedQueryConfig {
  table: string
  groupBy?: string
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  
  // For server table, use enhanced server filtering
  serverFilters?: ServerFilterConfig
  
  // For other tables, use basic filtering
  basicFilters?: EnhancedFilterConfig[]
  
  dateRange?: {
    field: string
    start: string
    end: string
  }
}

// Filter validation result
export interface FilterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  resultCount?: number
}

// Filter options for dropdowns
export interface ServerFilterOptions {
  models: string[]
  dc_sites: string[]
  dc_buildings: string[]
  dc_floors: string[]
  dc_rooms: string[]
  allocations: AllocationType[]
  environments: EnvironmentType[]
  status: ServerStatus[]
  device_types: DeviceType[]
  brands: string[]
}

// Hierarchical filter state for cascading dropdowns
export interface HierarchicalFilterState {
  selectedSite?: string
  availableBuildings: string[]
  selectedBuilding?: string
  availableFloors: string[]
  selectedFloor?: string
  availableRooms: string[]
  selectedRoom?: string
}