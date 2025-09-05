import { supabase } from '@/integrations/supabase/client';

export interface ComponentItem {
  id: string;
  device_id?: string;
  name?: string;
  created_at: string;
  updated_at: string;
  // Component-specific fields will be added based on type
  [key: string]: any;
}

export interface ComponentResponse {
  data: ComponentItem[];
  totalCount: number;
}

class ComponentService {
  private getApiUrl(path: string): string {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
    return `${baseUrl}/functions/v1${path}`;
  }

  private async getAuthHeaders() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      throw new Error('Not authenticated');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  }

  private getEndpointPath(componentType: string): string {
    switch (componentType) {
      case 'cpu':
        return '/device-cpu-specs';
      case 'memory':
        return '/device-memory-specs';
      case 'power':
        return '/device-power-specs';
      case 'network':
        return '/device-network-specs';
      case 'storage':
        return '/device-storage-specs';
      default:
        throw new Error(`Unknown component type: ${componentType}`);
    }
  }

  async getComponents(componentType: string, offset = 0, limit = 50): Promise<ComponentResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const endpoint = this.getEndpointPath(componentType);
      const url = `${this.getApiUrl(endpoint)}?offset=${offset}&limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${componentType} components: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform the API response to match our ComponentItem interface
      const data = this.transformApiResponse(componentType, result);
      
      return {
        data,
        totalCount: result.totalCount || 0
      };
    } catch (error) {
      console.error(`Error fetching ${componentType} components:`, error);
      throw error;
    }
  }

  async createComponent(componentType: string, componentData: any): Promise<ComponentItem> {
    try {
      const headers = await this.getAuthHeaders();
      const endpoint = this.getEndpointPath(componentType);
      const url = this.getApiUrl(endpoint);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(componentData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create ${componentType} component: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error creating ${componentType} component:`, error);
      throw error;
    }
  }

  async updateComponent(componentType: string, id: string, updateData: any): Promise<ComponentItem> {
    try {
      const headers = await this.getAuthHeaders();
      const endpoint = this.getEndpointPath(componentType);
      const url = this.getApiUrl(endpoint);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, ...updateData })
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${componentType} component: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error updating ${componentType} component:`, error);
      throw error;
    }
  }

  async deleteComponent(componentType: string, id: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const endpoint = this.getEndpointPath(componentType);
      const url = `${this.getApiUrl(endpoint)}?id=${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${componentType} component: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting ${componentType} component:`, error);
      throw error;
    }
  }

  private transformApiResponse(componentType: string, apiResponse: any): ComponentItem[] {
    const key = this.getResponseKey(componentType);
    const rawData = apiResponse[key] || [];
    
    return rawData.map((item: any) => ({
      ...item,
      name: this.generateComponentName(componentType, item),
      specifications: this.extractSpecifications(componentType, item)
    }));
  }

  private getResponseKey(componentType: string): string {
    switch (componentType) {
      case 'cpu':
        return 'cpuSpecs';
      case 'memory':
        return 'memorySpecs';
      case 'power':
        return 'powerSpecs';
      case 'network':
        return 'networkSpecs';
      case 'storage':
        return 'storageSpecs';
      default:
        return 'data';
    }
  }

  private generateComponentName(componentType: string, item: any): string {
    switch (componentType) {
      case 'cpu':
        return item.cpu_model || `${item.cpu_generation || 'Unknown'} CPU`;
      case 'memory':
        return `${item.total_capacity_gb || 0}GB ${item.memory_type || 'RAM'}`;
      case 'power':
        return `${item.max_power_watts || 0}W PSU`;
      case 'network':
        return `${item.nic_manufacturer || 'Unknown'} ${item.nic_model || 'NIC'}`;
      case 'storage':
        return `${item.storage_model || 'Unknown'} ${item.capacity_gb || 0}GB ${item.storage_type || 'Drive'}`;
      default:
        return 'Unknown Component';
    }
  }

  private extractSpecifications(componentType: string, item: any): any {
    switch (componentType) {
      case 'cpu':
        return {
          cores: item.physical_cores,
          threads: item.logical_cores,
          baseClockGHz: item.base_frequency_ghz,
          boostClockGHz: item.boost_frequency_ghz,
          architecture: item.cpu_architecture,
          tdpWatts: item.tdp_watts
        };
      case 'memory':
        return {
          capacity: `${item.total_capacity_gb}GB`,
          speed: `${item.memory_frequency_mhz}MHz`,
          type: item.memory_type,
          modules: item.module_count,
          ecc: item.ecc_support
        };
      case 'power':
        return {
          wattage: `${item.max_power_watts}W`,
          cableType: item.power_cable_type,
          slotNumber: item.psu_slot_number
        };
      case 'network':
        return {
          ports: item.port_quantity,
          speed: `${item.port_speed_gbps}Gbps`,
          portType: item.port_type,
          connectorType: item.connector_type,
          manufacturer: item.nic_manufacturer
        };
      case 'storage':
        return {
          capacity: `${item.capacity_gb}GB`,
          type: item.storage_type,
          interface: item.interface_type,
          formFactor: item.drive_form_factor,
          hotPlug: item.hot_plug_support,
          tier: item.performance_tier
        };
      default:
        return {};
    }
  }
}

export const componentService = new ComponentService();
