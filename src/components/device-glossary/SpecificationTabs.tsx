import React, { useState } from 'react';

interface SpecificationTabsProps {
  specs: any;
}

const tabs = [
  { key: 'cpu', label: 'CPU', icon: '🔧' },
  { key: 'memory', label: 'Memory', icon: '💾' },
  { key: 'storage', label: 'Storage', icon: '💿' },
  { key: 'network', label: 'Network', icon: '🌐' },
  { key: 'power', label: 'Power', icon: '⚡' },
  { key: 'management', label: 'Management', icon: '⚙️' }
];

const SpecificationTabs: React.FC<SpecificationTabsProps> = ({ specs }) => {
  const [activeTab, setActiveTab] = useState('cpu');

  const renderTabContent = (tabKey: string) => {
    // Check if we have specific specs for this tab
    const tabData = specs.specifications?.[tabKey] || specs[tabKey];
    
    switch (tabKey) {
      case 'cpu':
        return (
          <div className="space-y-4">
            {tabData ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">CPU Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-blue-700">Processor Model:</span>
                      <p className="text-blue-900">{tabData.cpu_model || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Generation:</span>
                      <p className="text-blue-900">{tabData.cpu_generation || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Physical Cores:</span>
                      <p className="text-blue-900">{tabData.physical_cores || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Logical Cores:</span>
                      <p className="text-blue-900">{tabData.logical_cores || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-blue-700">CPU Quantity:</span>
                      <p className="text-blue-900">{tabData.cpu_quantity || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Base Frequency:</span>
                      <p className="text-blue-900">{tabData.base_frequency_ghz ? `${tabData.base_frequency_ghz} GHz` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Boost Frequency:</span>
                      <p className="text-blue-900">{tabData.boost_frequency_ghz ? `${tabData.boost_frequency_ghz} GHz` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">TDP:</span>
                      <p className="text-blue-900">{tabData.tdp_watts ? `${tabData.tdp_watts}W` : 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">CPU Specifications</h4>
                  <div className="text-blue-800">
                    <p className="mb-2">This device model supports high-performance processors suitable for enterprise workloads.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Compatible with Intel Xeon and AMD EPYC processors</li>
                      <li>• Supports up to dual socket configurations</li>
                      <li>• Multi-core architecture optimized for server workloads</li>
                      <li>• Advanced power management features</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Detailed CPU specifications will be added through the Admin Panel. This includes specific processor models, clock speeds, core counts, and power consumption data.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'memory':
        return (
          <div className="space-y-4">
            {tabData ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-900 mb-4">Memory Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-green-700">Total Capacity:</span>
                      <p className="text-green-900">{tabData.total_capacity_gb ? `${tabData.total_capacity_gb} GB` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Memory Type:</span>
                      <p className="text-green-900">{tabData.memory_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Frequency:</span>
                      <p className="text-green-900">{tabData.memory_frequency_mhz ? `${tabData.memory_frequency_mhz} MHz` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Module Count:</span>
                      <p className="text-green-900">{tabData.module_count || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-green-700">Module Capacity:</span>
                      <p className="text-green-900">{tabData.module_capacity_gb ? `${tabData.module_capacity_gb} GB each` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">ECC Support:</span>
                      <p className="text-green-900">{tabData.ecc_support !== undefined ? (tabData.ecc_support ? 'Yes' : 'No') : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Maximum Capacity:</span>
                      <p className="text-green-900">{tabData.maximum_capacity_gb ? `${tabData.maximum_capacity_gb} GB` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Memory Channels:</span>
                      <p className="text-green-900">{tabData.memory_channels || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">Memory Specifications</h4>
                  <div className="text-green-800">
                    <p className="mb-2">Enterprise-grade memory support for demanding applications.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• DDR4/DDR5 ECC registered memory support</li>
                      <li>• Multiple DIMM slots for expansion</li>
                      <li>• Error correction and reliability features</li>
                      <li>• High-speed memory interfaces</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Detailed memory specifications can be configured in the Admin Panel, including supported capacities, speeds, and compatibility matrices.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-4">
            {tabData && Array.isArray(tabData) && tabData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-purple-900 mb-4">Storage Specifications</h4>
                {tabData.map((storage, index) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h5 className="text-md font-semibold text-purple-800 mb-3">Storage Slot {storage.storage_slot_number}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-purple-700">Storage Model:</span>
                        <p className="text-purple-900">{storage.storage_model || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-700">Type:</span>
                        <p className="text-purple-900">{storage.storage_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-700">Capacity:</span>
                        <p className="text-purple-900">{storage.capacity_gb ? `${storage.capacity_gb} GB` : 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-700">Interface:</span>
                        <p className="text-purple-900">{storage.interface_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-700">Form Factor:</span>
                        <p className="text-purple-900">{storage.drive_form_factor || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-700">Hot Plug:</span>
                        <p className="text-purple-900">{storage.hot_plug_support !== undefined ? (storage.hot_plug_support ? 'Yes' : 'No') : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-purple-900 mb-2">Storage Specifications</h4>
                  <div className="text-purple-800">
                    <p className="mb-2">Flexible storage options for various deployment scenarios.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Support for SSD and NVMe drives</li>
                      <li>• RAID configuration capabilities</li>
                      <li>• Hot-swappable drive bays</li>
                      <li>• High-performance storage controllers</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Storage specifications including supported drive types, capacities, and RAID configurations can be managed through the Admin Panel.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'network':
        return (
          <div className="space-y-4">
            {tabData && Array.isArray(tabData) && tabData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-cyan-900 mb-4">Network Specifications</h4>
                {tabData.map((network, index) => (
                  <div key={index} className="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
                    <h5 className="text-md font-semibold text-cyan-800 mb-3">NIC Slot {network.nic_slot_number}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-cyan-700">NIC Type:</span>
                        <p className="text-cyan-900">{network.nic_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Manufacturer:</span>
                        <p className="text-cyan-900">{network.nic_manufacturer || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Model:</span>
                        <p className="text-cyan-900">{network.nic_model || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Port Type:</span>
                        <p className="text-cyan-900">{network.port_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Port Speed:</span>
                        <p className="text-cyan-900">{network.port_speed_gbps ? `${network.port_speed_gbps} Gbps` : 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Port Quantity:</span>
                        <p className="text-cyan-900">{network.port_quantity || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-cyan-700">Management Port:</span>
                        <p className="text-cyan-900">{network.is_management_port !== undefined ? (network.is_management_port ? 'Yes' : 'No') : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-cyan-900 mb-2">Network Specifications</h4>
                  <div className="text-cyan-800">
                    <p className="mb-2">Enterprise networking capabilities for high-performance connectivity.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Gigabit and 10GbE network interfaces</li>
                      <li>• Redundant network connections</li>
                      <li>• Advanced network management features</li>
                      <li>• Support for various network topologies</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Network interface specifications including port counts, speeds, and protocols can be configured in the Admin Panel.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'power':
        return (
          <div className="space-y-4">
            {tabData && Array.isArray(tabData) && tabData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-yellow-900 mb-4">Power Specifications</h4>
                {tabData.map((power, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h5 className="text-md font-semibold text-yellow-800 mb-3">PSU Slot {power.psu_slot_number}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-yellow-700">Max Power:</span>
                        <p className="text-yellow-900">{power.max_power_watts ? `${power.max_power_watts}W` : 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-yellow-700">Cable Type:</span>
                        <p className="text-yellow-900">{power.power_cable_type || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-2">Power Specifications</h4>
                  <div className="text-yellow-800">
                    <p className="mb-2">Efficient power management for optimal data center operations.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• High-efficiency power supplies</li>
                      <li>• Redundant power configurations</li>
                      <li>• Advanced power monitoring</li>
                      <li>• Energy-efficient design</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Power consumption data, PSU specifications, and efficiency ratings can be added through the Admin Panel.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'management':
        return (
          <div className="space-y-4">
            {tabData ? (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-indigo-900 mb-4">Management Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-indigo-700">Management Type:</span>
                      <p className="text-indigo-900">{tabData.management_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-indigo-700">Remote Console:</span>
                      <p className="text-indigo-900">{tabData.remote_console_support !== undefined ? (tabData.remote_console_support ? 'Supported' : 'Not supported') : 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-indigo-700">Power Control:</span>
                      <p className="text-indigo-900">{tabData.power_control_support !== undefined ? (tabData.power_control_support ? 'Supported' : 'Not supported') : 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-indigo-900 mb-2">Management Features</h4>
                  <div className="text-indigo-800">
                    <p className="mb-2">Comprehensive management and monitoring capabilities.</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Remote management interfaces (IPMI, BMC)</li>
                      <li>• Hardware monitoring and alerting</li>
                      <li>• Console redirection capabilities</li>
                      <li>• Firmware update mechanisms</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <p>📋 <strong>Note:</strong> Management interface details and monitoring capabilities can be specified through the Admin Panel.</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div className="text-gray-500">No specification data available.</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {renderTabContent(activeTab)}
      </div>
    </div>
  );
};

export default SpecificationTabs;
