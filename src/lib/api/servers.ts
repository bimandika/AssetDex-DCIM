import { createClient } from '@/lib/supabase/client';
import { Server, ServerStatus, DeviceType, EnvironmentType, AllocationType } from '@/types/server';

type ServerType = Server & {
  id: string;
  created_at: string;
  updated_at: string;
};

interface ApiResponse<T> {
  data: T;
  error: string | null;
}

interface PaginationInfo {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ServerFilterParams {
  // Text search
  search?: string;
  
  // Exact match filters
  status?: string[];
  device_type?: string[];
  environment?: string[];
  allocation?: string[];
  dc_site?: string[];
  
  // Pagination
  page?: number;
  page_size?: number;
  
  // Sorting
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export async function fetchServers(
  params: ServerFilterParams = {}
): Promise<PaginatedResponse<ServerType>> {
  const supabase = createClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add filters
    if (params.search) queryParams.append('search', params.search);
    if (params.status?.length) params.status.forEach(s => queryParams.append('status', s));
    if (params.device_type?.length) params.device_type.forEach(t => queryParams.append('device_type', t));
    if (params.environment?.length) params.environment.forEach(e => queryParams.append('environment', e));
    if (params.allocation?.length) params.allocation.forEach(a => queryParams.append('allocation', a));
    if (params.dc_site?.length) params.dc_site.forEach(s => queryParams.append('dc_site', s));
    
    // Add pagination
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 10;
    queryParams.append('page', page.toString());
    queryParams.append('page_size', pageSize.toString());
    
    // Add sorting
    if (params.sort_by) {
      queryParams.append('sort_by', params.sort_by);
      queryParams.append('sort_direction', params.sort_direction ?? 'asc');
    }

    const response = await fetch(`/api/servers?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch servers');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      pagination: result.pagination || {
        current_page: page,
        page_size: pageSize,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false
      }
    };
  } catch (error) {
    console.error('Error fetching servers:', error);
    throw error;
  }
}

export async function getFilterOptions() {
  const supabase = createClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    { data: sites },
  ] = await Promise.all([
    supabase.from('servers').select('status').not('status', 'is', null),
    supabase.from('servers').select('device_type').not('device_type', 'is', null),
    supabase.from('servers').select('environment').not('environment', 'is', null),
    supabase.from('servers').select('allocation').not('allocation', 'is', null),
    supabase.from('servers').select('dc_site').not('dc_site', 'is', null),
  ]);

  // Extract unique values
  const getUnique = (arr: any[], key: string) => 
    [...new Set(arr.map(item => item[key]).filter(Boolean))];

  return {
    statuses: getUnique(statuses || [], 'status'),
    deviceTypes: getUnique(deviceTypes || [], 'device_type'),
    environments: getUnique(environments || [], 'environment'),
    allocations: getUnique(allocations || [], 'allocation'),
    sites: getUnique(sites || [], 'dc_site'),
  };
}
