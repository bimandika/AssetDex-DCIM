export type ServerStatus = 'Active' | 'Ready' | 'Inactive' | 'Maintenance' | 'Decommissioned' | 'Retired';

export type DeviceType = 'Server' | 'Storage' | 'Network';
export type EnvironmentType = 'Production' | 'Testing' | 'Pre-Production' | 'Development';
export type AllocationType = 'IAAS' | 'PAAS' | 'SAAS' | 'Load Balancer' | 'Database';

export interface ServerEnums {
  status: ServerStatus[];
  deviceTypes: DeviceType[];
  allocationTypes: AllocationType[];
  environmentTypes: EnvironmentType[];
  racks: string[];
  units: string[];
  brands: string[];
  models: string[];
  osTypes: string[];
  sites: string[];
  buildings: string[];
  floors: string[];
  rooms: string[];
  // Allow dynamic enum properties
  [key: string]: string[];
}

// Default values in case API fails
export const defaultServerEnums: ServerEnums = {
  status: ['Active', 'Ready', 'Inactive', 'Maintenance', 'Decommissioned', 'Retired'],
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
  buildings: ['Building-A', 'Building-B', 'Building-C', 'Building-D', 'Building-E', 'Other'],
  floors: ['1', '2', '3', '4', '5', 'B1', 'B2', 'Ground', 'Mezzanine'],
  rooms: [
    'MDF', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
    '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
    '301', '302', '303', '304', '305', '306', '307', '308', '309', '310',
    '401', '402', '403', '404', '405', '406', '407', '408', '409', '410',
    'Server Room A', 'Server Room B', 'Network Room', 'Storage Room', 'Other'
  ]
};
