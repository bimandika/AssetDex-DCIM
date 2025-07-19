export interface ServerEnums {
  status: string[];
  deviceTypes: string[];
  allocationTypes: string[];
  environmentTypes: string[];
}

// Default values in case API fails
export const defaultServerEnums: ServerEnums = {
  status: ['Active', 'Inactive', 'Maintenance', 'Decommissioned', 'Retired', 'Other'],
  deviceTypes: ['Server', 'Storage', 'Network'],
  allocationTypes: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database', 'Other'],
  environmentTypes: ['Production', 'Testing', 'Pre-Production', 'Development', 'Staging']
};
