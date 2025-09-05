import React, { useState, useEffect } from 'react';
import AddDeviceDialog from './AddDeviceDialog';
import EditSpecificationsDialog from './EditSpecificationsDialog';
import ComponentManagementDialog from './ComponentManagementDialog';
import { useEnumContext } from '../../contexts/EnumContext';

const DeviceGlossaryAdmin: React.FC = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');
  
  // Component management dialog states
  const [cpuManagementOpen, setCpuManagementOpen] = useState(false);
  const [memoryManagementOpen, setMemoryManagementOpen] = useState(false);
  const [powerManagementOpen, setPowerManagementOpen] = useState(false);
  const [networkManagementOpen, setNetworkManagementOpen] = useState(false);
  const [storageManagementOpen, setStorageManagementOpen] = useState(false);

  // Enum management
  const { enums, addEnumValue, refreshEnums } = useEnumContext();
  const [newYear, setNewYear] = useState('');
  const [addingYear, setAddingYear] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // Get authentication token from localStorage or session
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const response = await fetch('http://localhost:8000/functions/v1/device-glossary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const devices = Array.isArray(data) ? data : (data.devices || []);
        setDevices(devices);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (device: any) => {
    try {
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      await fetch('http://localhost:8000/functions/v1/device-glossary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(device)
      });
      setAddOpen(false);
      fetchDevices(); // Refresh device list
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const handleEditSpecs = async (specs: any) => {
    if (!selectedDevice) return;
    
    try {
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const payload = { ...specs, id: selectedDevice.id };
      console.log('Sending update payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`http://localhost:8000/functions/v1/device-glossary`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error(`Update failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Update response:', result);
      
      setEditOpen(false);
      setSelectedDevice(null);
      fetchDevices(); // Refresh device list
    } catch (error) {
      console.error('Error updating device:', error);
    }
  };

  const fetchDeviceWithSpecs = async (deviceId: string) => {
    try {
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const response = await fetch(`http://localhost:8000/functions/v1/device-glossary/${deviceId}/complete-specs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch device specs');
      
      const data = await response.json();
      
      // Transform the data structure to match what EditSpecificationsDialog expects
      const deviceWithComponents = {
        ...data.device,
        specifications: data.specifications,
        // Map specifications to components structure
        components: {
          cpu: data.specifications.cpu ? [{
            id: data.specifications.cpu.id,
            name: data.specifications.cpu.cpu_model, // This is what displays in the title
            model: data.specifications.cpu.cpu_model,
            component_model: data.specifications.cpu.cpu_model,
            component_type: 'CPU',
            specifications: {
              generation: data.specifications.cpu.cpu_generation,
              cores: data.specifications.cpu.physical_cores,
              threads: data.specifications.cpu.logical_cores,
              baseClockGHz: data.specifications.cpu.base_frequency_ghz, // Fixed field name
              base_frequency: data.specifications.cpu.base_frequency_ghz,
              boost_frequency: data.specifications.cpu.boost_frequency_ghz,
              architecture: data.specifications.cpu.cpu_architecture,
              tdp: data.specifications.cpu.tdp_watts,
              l1_cache: data.specifications.cpu.l1_cache_kb,
              l2_cache: data.specifications.cpu.l2_cache_mb,
              l3_cache: data.specifications.cpu.l3_cache_mb,
              instruction_sets: data.specifications.cpu.instruction_sets
            },
            quantity: data.specifications.cpu.cpu_quantity || 1
          }] : [],
          memory: data.specifications.memory ? [{
            id: data.specifications.memory.id,
            name: `${data.specifications.memory.memory_type} Memory`, // This is what displays in the title
            model: `${data.specifications.memory.memory_type} Memory`,
            component_model: `${data.specifications.memory.memory_type} Memory`,
            component_type: 'Memory',
            specifications: {
              capacity: data.specifications.memory.total_capacity_gb, // Dialog expects 'capacity'
              type: data.specifications.memory.memory_type, // Dialog expects 'type'
              speed: data.specifications.memory.memory_frequency_mhz, // Dialog expects 'speed'
              ecc: data.specifications.memory.ecc_support, // Dialog expects 'ecc'
              frequency: data.specifications.memory.memory_frequency_mhz,
              module_count: data.specifications.memory.module_count,
              module_capacity: data.specifications.memory.module_capacity_gb,
              ecc_support: data.specifications.memory.ecc_support,
              max_capacity: data.specifications.memory.maximum_capacity_gb,
              channels: data.specifications.memory.memory_channels
            }
          }] : [],
          storage: (data.specifications.storage || []).map((storage: any) => ({
            id: storage.id,
            name: storage.storage_model, // This is what displays in the title
            model: storage.storage_model,
            component_model: storage.storage_model,
            component_type: storage.storage_type,
            specifications: {
              capacity: storage.capacity_gb, // Fixed field name - dialog expects 'capacity'
              type: storage.storage_type, // Fixed field name - dialog expects 'type'
              interface: storage.interface_type, // Fixed field name - dialog expects 'interface'
              hotPlug: storage.hot_plug_support, // Fixed field name - dialog expects 'hotPlug'
              capacity_gb: storage.capacity_gb,
              interface_type: storage.interface_type,
              hot_plug_support: storage.hot_plug_support,
              form_factor: storage.drive_form_factor,
              performance_tier: storage.performance_tier,
              warranty_years: storage.warranty_years
            },
            quantity: storage.quantity || 1,
            storage_type: storage.storage_type,
            capacity_gb: storage.capacity_gb,
            interface_type: storage.interface_type,
            hot_plug_support: storage.hot_plug_support,
            drive_form_factor: storage.drive_form_factor,
            performance_tier: storage.performance_tier,
            warranty_years: storage.warranty_years
          })),
          network: (data.specifications.network || []).map((network: any) => ({
            id: network.id,
            name: network.nic_model, // This is what displays in the title
            model: network.nic_model,
            component_model: network.nic_model,
            component_type: network.nic_type,
            manufacturer: network.nic_manufacturer,
            specifications: {
              ports: network.port_quantity, // Dialog expects 'ports'
              speed: network.port_speed_gbps, // Dialog expects 'speed'
              type: network.nic_type, // Dialog expects 'type'
              port_type: network.port_type,
              connector: network.connector_type,
              management: network.is_management_port,
              modules: network.supported_modules,
              drivers: network.driver_support
            },
            nic_type: network.nic_type,
            nic_manufacturer: network.nic_manufacturer,
            port_type: network.port_type,
            port_speed_gbps: network.port_speed_gbps,
            port_quantity: network.port_quantity,
            connector_type: network.connector_type,
            is_management_port: network.is_management_port,
            supported_modules: network.supported_modules,
            driver_support: network.driver_support
          })),
          power: (data.specifications.power || []).map((power: any) => ({
            id: power.id,
            name: `${power.max_power_watts}W PSU`, // This is what displays in the title
            model: `${power.max_power_watts}W PSU`,
            component_model: `${power.max_power_watts}W PSU`,
            component_type: 'Power Supply',
            specifications: {
              wattage: power.max_power_watts, // Dialog expects 'wattage'
              efficiency: '80+ Bronze', // Default efficiency since not stored in DB
              redundant: false, // Default redundant since not stored in DB
              cable_type: power.power_cable_type
            },
            max_power_watts: power.max_power_watts,
            power_cable_type: power.power_cable_type
          }))
        }
      };
      
      setSelectedDevice(deviceWithComponents);
      setEditOpen(true);
    } catch (error) {
      console.error('Error fetching device specs:', error);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      await fetch(`http://localhost:8000/functions/v1/device-glossary/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchDevices(); // Refresh device list
    } catch (error) {
      console.error('Error deleting device:', error);
    }
  };

  // Enum management functions
  const handleAddYear = async () => {
    if (!newYear.trim()) return;
    
    // Validate that it's a valid year
    const yearNum = parseInt(newYear.trim());
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > 2050) {
      alert('Please enter a valid year between 1990 and 2050');
      return;
    }
    
    setAddingYear(true);
    try {
      const success = await addEnumValue('year', newYear.trim());
      if (success) {
        setNewYear('');
        await refreshEnums();
      }
    } catch (error) {
      console.error('Error adding year:', error);
    } finally {
      setAddingYear(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Device Glossary Administration</h1>
        <p className="text-green-100">Manage device models, specifications, and hardware components</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('devices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'devices'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Device Models
            </button>
            <button
              onClick={() => setActiveTab('components')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'components'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hardware Components
            </button>
            <button
              onClick={() => setActiveTab('enums')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enums'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Year Management
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'devices' && (
            <div className="space-y-4">
              {/* Device Management Actions */}
              <div className="flex gap-2 mb-6">
                <button 
                  className="px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 transition"
                  onClick={() => setAddOpen(true)}
                >
                  + Add New Device Model
                </button>
                <button 
                  className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition" 
                  onClick={() => selectedDevice && fetchDeviceWithSpecs(selectedDevice.id)} 
                  disabled={!selectedDevice}
                >
                  Edit Specifications
                </button>
              </div>

              {/* Device List */}
              {loading ? (
                <div className="text-center py-8">Loading devices...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device Model
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manufacturer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {devices.map((device) => (
                        <tr key={device.id} className={selectedDevice?.id === device.id ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="radio"
                              name="selectedDevice"
                              checked={selectedDevice?.id === device.id}
                              onChange={() => setSelectedDevice(device)}
                              className="form-radio h-4 w-4 text-green-600"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {device.device_model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.manufacturer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.device_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {device.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteDevice(device.id)}
                              className="text-red-600 hover:text-red-900 ml-2"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {devices.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No devices found. Add your first device model above.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU Management */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">CPU Management</h3>
                  <p className="text-blue-700 text-sm mb-3">Manage processor specifications and models</p>
                  <button 
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                    onClick={() => setCpuManagementOpen(true)}
                  >
                    Manage CPUs
                  </button>
                </div>

                {/* Memory Management */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Memory Management</h3>
                  <p className="text-green-700 text-sm mb-3">Manage RAM specifications and compatibility</p>
                  <button 
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                    onClick={() => setMemoryManagementOpen(true)}
                  >
                    Manage Memory
                  </button>
                </div>

                {/* Power Management */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Power Management</h3>
                  <p className="text-yellow-700 text-sm mb-3">Manage PSU specifications and requirements</p>
                  <button 
                    className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm"
                    onClick={() => setPowerManagementOpen(true)}
                  >
                    Manage Power
                  </button>
                </div>

                {/* Network Interface Management */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Network Interfaces</h3>
                  <p className="text-purple-700 text-sm mb-3">Manage Network Interface Card specifications and capabilities</p>
                  <button 
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm"
                    onClick={() => setNetworkManagementOpen(true)}
                  >
                    Manage NICs
                  </button>
                </div>

                {/* Storage Management */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Storage Devices</h3>
                  <p className="text-orange-700 text-sm mb-3">Manage storage specifications and capabilities</p>
                  <button 
                    className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-sm"
                    onClick={() => setStorageManagementOpen(true)}
                  >
                    Manage Storage
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Component Management Features</h4>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• Add new hardware specifications for CPU, Memory, Power, Network, and Storage components</li>
                  <li>• Define compatibility matrices between different components</li>
                  <li>• Set performance benchmarks and power consumption data</li>
                  <li>• Manage component lifecycle and end-of-life information</li>
                  <li>• Import/export component data in bulk</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'enums' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-blue-900 mb-4">Year Management</h3>
                <p className="text-blue-700 mb-6">
                  Manage year values for device filters. Years are automatically detected from existing devices, 
                  but you can add additional years here for future devices.
                </p>

                <div className="max-w-md">
                  {/* Year Management */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Available Years</h4>
                    
                    {/* Add new year */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        placeholder="Enter year (e.g., 2026)"
                        min="1990"
                        max="2050"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddYear()}
                      />
                      <button
                        onClick={handleAddYear}
                        disabled={addingYear || !newYear.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingYear ? 'Adding...' : 'Add'}
                      </button>
                    </div>

                    {/* Current years */}
                    <div className="max-h-48 overflow-y-auto">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Current Years:</h5>
                      <div className="flex flex-wrap gap-1">
                        {enums.years?.map((year: string) => (
                          <span key={year} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {year}
                          </span>
                        )) || (
                          <span className="text-xs text-gray-500">Years are auto-detected from devices</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="text-sm font-semibold text-yellow-800 mb-2">💡 About Year Management:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Years are automatically extracted from device data in the filters</li>
                    <li>• You can add future years here for planning upcoming device releases</li>
                    <li>• Manufacturers and models are managed through the main enum system</li>
                    <li>• Device types are predefined in the system configuration</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddDeviceDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddDevice} />
      <EditSpecificationsDialog open={editOpen} device={selectedDevice} onClose={() => setEditOpen(false)} onSave={handleEditSpecs} />
      
      {/* Component Management Dialogs */}
      <ComponentManagementDialog 
        open={cpuManagementOpen} 
        onClose={() => setCpuManagementOpen(false)} 
        componentType="cpu"
        title="CPU Management"
      />
      <ComponentManagementDialog 
        open={memoryManagementOpen} 
        onClose={() => setMemoryManagementOpen(false)} 
        componentType="memory"
        title="Memory Management"
      />
      <ComponentManagementDialog 
        open={powerManagementOpen} 
        onClose={() => setPowerManagementOpen(false)} 
        componentType="power"
        title="Power Management"
      />
      <ComponentManagementDialog 
        open={networkManagementOpen} 
        onClose={() => setNetworkManagementOpen(false)} 
        componentType="network"
        title="Network Interface Management"
      />
      <ComponentManagementDialog 
        open={storageManagementOpen} 
        onClose={() => setStorageManagementOpen(false)} 
        componentType="storage"
        title="Storage Management"
      />
    </div>
  );
};

export default DeviceGlossaryAdmin;
