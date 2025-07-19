export type ServerStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Decommissioned' | 'Retired';

export interface ServerEnums {
  status: ServerStatus[];
  deviceTypes: string[];
  allocationTypes: string[];
  environmentTypes: string[];
  racks: string[];
  units: string[];
  brands: string[];
  models: string[];
  osTypes: string[];
  sites: string[];
  buildings: string[];
}

// Default values in case API fails
export const defaultServerEnums: ServerEnums = {
  status: ['Active', 'Inactive', 'Maintenance', 'Decommissioned', 'Retired'],
  deviceTypes: ['Server', 'Storage', 'Network'],
  allocationTypes: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database'],
  environmentTypes: ['Production', 'Testing', 'Pre-Production', 'Development'],
  racks: Array.from({ length: 31 }, (_, i) => `RACK-${String(i + 1).padStart(2, '0')}`),
  units: Array.from({ length: 54 }, (_, i) => `U${i + 1}`),
  brands: ['Dell', 'HPE', 'Cisco', 'Juniper', 'NetApp', 'Huawei', 'Inspur', 'Kaytus', 'ZTE', 'Meta Brain'],
  models: [
    'PowerEdge R740', 'PowerEdge R750', 'PowerEdge R750xd', 'PowerVault ME4',
    'ProLiant DL380', 'ProLiant DL360', 'Apollo 4510', 'ASA 5525-X',
    'Nexus 93180YC-EX', 'MX204', 'AFF A400', 'Other'
  ],
  osTypes: [
    'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'RHEL 8', 'CentOS 7',
    'Oracle Linux 8', 'Windows Server 2022', 'Windows Server 2019',
    'Storage OS 2.1', 'Cisco ASA 9.16', 'NX-OS 9.3', 'JunOS 21.2',
    'ONTAP 9.10', 'Other'
  ],
  sites: ['DC-East', 'DC-West', 'DC-North', 'DC-South', 'DC-Central', 'DC1', 'DC2', 'DC3', 'DC4', 'DC5'],
  buildings: ['Building-A', 'Building-B', 'Building-C', 'Building-D', 'Building-E', 'Other']
};
