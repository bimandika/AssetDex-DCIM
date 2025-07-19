export type ServerStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Decommissioned' | 'Retired';

export interface ServerEnums {
  status: ServerStatus[];
  deviceTypes: string[];
  allocationTypes: string[];
  environmentTypes: string[];
}

// Default values in case API fails
export const defaultServerEnums: ServerEnums = {
  status: ['Active', 'Inactive', 'Maintenance', 'Decommissioned', 'Retired'],
  deviceTypes: ['Server', 'Storage', 'Network'],
  allocationTypes: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database'],
  environmentTypes: ['Production', 'Testing', 'Pre-Production', 'Development']
};
