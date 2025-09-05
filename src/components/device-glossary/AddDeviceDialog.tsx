import React, { useState, useEffect } from 'react';
import { useDeviceEnums } from '../../hooks/useBrandTypes';
import { componentService } from '@/services/componentService';

interface AddDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (device: any) => void;
}

const AddDeviceDialog: React.FC<AddDeviceDialogProps> = ({ open, onClose, onAdd }) => {
  const { brands, models, deviceTypes, loading: enumsLoading } = useDeviceEnums();
  const [formData, setFormData] = useState({
    device_model: '',
    manufacturer: '',
    year: new Date().getFullYear(),
    unit_height: '1U',
    device_type: '',
    status: 'active',
    description: '',
    // Component specifications
    cpu_specs: {
      processor_family: '',
      processor_model: '',
      cores: '',
      threads: '',
      base_clock: '',
      max_clock: '',
      cache: '',
      tdp: '',
      socket_type: '',
      socket_count: '1'
    },
    memory_specs: {
      memory_type: 'DDR4',
      max_capacity: '',
      dimm_slots: '',
      ecc_support: true,
      speed: '',
      form_factor: 'RDIMM'
    },
    storage_specs: {
      storage_bays: '',
      supported_drives: [],
      raid_support: [],
      hot_swap: true,
      controller_type: ''
    },
    network_specs: {
      ethernet_ports: '',
      port_speed: '1GbE',
      management_port: true,
      expansion_slots: ''
    },
    power_specs: {
      psu_wattage: '',
      psu_efficiency: '80+ Gold',
      redundant_psu: false,
      power_consumption_idle: '',
      power_consumption_max: ''
    }
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [availableComponents, setAvailableComponents] = useState<{
    cpu: any[];
    memory: any[];
    storage: any[];
    network: any[];
    power: any[];
  }>({
    cpu: [],
    memory: [],
    storage: [],
    network: [],
    power: []
  });
  const [selectedComponents, setSelectedComponents] = useState<{
    cpu: any[];
    memory: any[];
    storage: any[];
    network: any[];
    power: any[];
  }>({
    cpu: [],
    memory: [],
    storage: [],
    network: [],
    power: []
  });
  const [loadingComponents, setLoadingComponents] = useState(false);

  // Load available components from the database
  const loadAvailableComponents = async () => {
    if (!open) return;
    
    setLoadingComponents(true);
    try {
      const componentTypes = ['cpu', 'memory', 'storage', 'network', 'power'];
      const componentData: any = {};
      
      for (const type of componentTypes) {
        try {
          const result = await componentService.getComponents(type, 0, 100);
          componentData[type] = result.data;
        } catch (error) {
          console.error(`Error loading ${type} components:`, error);
          componentData[type] = [];
        }
      }
      
      setAvailableComponents(componentData);
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoadingComponents(false);
    }
  };

  const handleComponentSelect = (componentType: string, component: any) => {
    if (!component) return;
    
    setSelectedComponents(prev => {
      const currentComponents = prev[componentType as keyof typeof prev] || [];
      
      // Allow multiple instances of the same component (e.g., 2x Samsung WD drives)
      // Just add the component without checking for duplicates
      return {
        ...prev,
        [componentType]: [...currentComponents, component]
      };
    });
  };

  const handleComponentRemove = (componentType: string, componentId: string, index?: number) => {
    setSelectedComponents(prev => {
      const currentComponents = prev[componentType as keyof typeof prev];
      
      if (index !== undefined) {
        // Remove by specific index (for identical components)
        return {
          ...prev,
          [componentType]: currentComponents.filter((_, i) => i !== index)
        };
      } else {
        // Remove by ID (legacy support)
        return {
          ...prev,
          [componentType]: currentComponents.filter((comp: any) => comp.id !== componentId)
        };
      }
    });
  };

  useEffect(() => {
    loadAvailableComponents();
  }, [open]);

  const handleInputChange = (field: string, value: any, category?: string) => {
    setFormData(prev => {
      if (category) {
        return {
          ...prev,
          [category]: {
            ...(prev[category as keyof typeof prev] as object),
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSubmit = () => {
    const deviceData = {
      // Basic device info
      device_model: formData.device_model,
      manufacturer: formData.manufacturer,
      year: formData.year,
      unit_height: formData.unit_height,
      device_type: formData.device_type,
      status: formData.status,
      description: formData.description,
      // Component specifications as JSON
      specifications: {
        cpu: formData.cpu_specs,
        memory: formData.memory_specs,
        storage: formData.storage_specs,
        network: formData.network_specs,
        power: formData.power_specs
      },
      // Selected components with quantities
      components: {
        cpu: selectedComponents.cpu,
        memory: selectedComponents.memory,
        storage: selectedComponents.storage,
        network: selectedComponents.network,
        power: selectedComponents.power
      }
    };
    onAdd(deviceData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <h2 className="text-2xl font-bold">Add New Device Model</h2>
          <p className="text-green-100">Define device specifications and component compatibility</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'basic', label: 'Basic Info', icon: '📋' },
              { key: 'cpu', label: 'CPU', icon: '🔧' },
              { key: 'memory', label: 'Memory', icon: '💾' },
              { key: 'storage', label: 'Storage', icon: '💿' },
              { key: 'network', label: 'Network', icon: '🌐' },
              { key: 'power', label: 'Power', icon: '⚡' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device Model *</label>
                  <select
                    value={formData.device_model}
                    onChange={(e) => handleInputChange('device_model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={enumsLoading}
                  >
                    <option value="">
                      {enumsLoading ? 'Loading models...' : 'Select Device Model'}
                    </option>
                    {models.map((model: string) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer *</label>
                  <select
                    value={formData.manufacturer}
                    onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={enumsLoading}
                  >
                    <option value="">
                      {enumsLoading ? 'Loading manufacturers...' : 'Select Manufacturer'}
                    </option>
                    {brands.map((brand: string) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="2000"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Height</label>
                  <select
                    value={formData.unit_height}
                    onChange={(e) => handleInputChange('unit_height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="1U">1U</option>
                    <option value="2U">2U</option>
                    <option value="3U">3U</option>
                    <option value="4U">4U</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => handleInputChange('device_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={enumsLoading}
                  >
                    <option value="">
                      {enumsLoading ? 'Loading device types...' : 'Select Device Type'}
                    </option>
                    {deviceTypes.map((type: string) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">Active</option>
                    <option value="eol">End of Life</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the device capabilities and use cases..."
                />
              </div>
            </div>
          )}

          {activeTab === 'cpu' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Specifications</h3>
              
              {/* Component Selection Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Select CPU Components</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Available CPU Components</label>
                    {loadingComponents ? (
                      <div className="text-sm text-blue-600">Loading components...</div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const selected = availableComponents.cpu.find((comp: any) => comp.id === e.target.value);
                          if (selected) {
                            handleComponentSelect('cpu', selected);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select a CPU component to add</option>
                        {availableComponents.cpu.map((component: any) => (
                          <option key={`${component.id}-${Math.random()}`} value={component.id}>
                            {component.name} - {component.specifications?.architecture} - {component.specifications?.cores} cores
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Selected Components List */}
                  {selectedComponents.cpu.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-blue-700">Selected CPU Components ({selectedComponents.cpu.length})</label>
                      {selectedComponents.cpu.map((component: any, index: number) => (
                        <div key={`${component.id}-${index}`} className="flex items-center justify-between text-sm text-blue-600 bg-white p-3 rounded border border-blue-200">
                          <div className="flex-1">
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-gray-600">
                              Cores: {component.specifications?.cores} | 
                              Threads: {component.specifications?.threads} | 
                              Base Clock: {component.specifications?.baseClockGHz}GHz | 
                              Architecture: {component.specifications?.architecture}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleComponentRemove('cpu', component.id, index)}
                            className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Specifications</h3>
              
              {/* Component Selection Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">Select Memory Components</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Available Memory Components</label>
                    {loadingComponents ? (
                      <div className="text-sm text-green-600">Loading components...</div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const selected = availableComponents.memory.find((comp: any) => comp.id === e.target.value);
                          if (selected) {
                            handleComponentSelect('memory', selected);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      >
                        <option value="">Select a memory component to add</option>
                        {availableComponents.memory.map((component: any) => (
                          <option key={`${component.id}-${Math.random()}`} value={component.id}>
                            {component.name} - {component.specifications?.type} - {component.specifications?.capacity}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Selected Components List */}
                  {selectedComponents.memory.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-green-700">Selected Memory Components ({selectedComponents.memory.length})</label>
                      {selectedComponents.memory.map((component: any, index: number) => (
                        <div key={`${component.id}-${index}`} className="flex items-center justify-between text-sm text-green-600 bg-white p-3 rounded border border-green-200">
                          <div className="flex-1">
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-gray-600">
                              Capacity: {component.specifications?.capacity} | 
                              Type: {component.specifications?.type} | 
                              Speed: {component.specifications?.speed} | 
                              ECC: {component.specifications?.ecc ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleComponentRemove('memory', component.id, index)}
                            className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Specifications</h3>
              
              {/* Component Selection Section */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">Select Storage Components</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Available Storage Components</label>
                    {loadingComponents ? (
                      <div className="text-sm text-purple-600">Loading components...</div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const selected = availableComponents.storage.find((comp: any) => comp.id === e.target.value);
                          if (selected) {
                            handleComponentSelect('storage', selected);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="">Select a storage component to add</option>
                        {availableComponents.storage.map((component: any) => (
                          <option key={`${component.id}-${Math.random()}`} value={component.id}>
                            {component.name} - {component.specifications?.type} - {component.specifications?.capacity}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Selected Components List */}
                  {selectedComponents.storage.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-purple-700">Selected Storage Components ({selectedComponents.storage.length})</label>
                      {selectedComponents.storage.map((component: any, index: number) => (
                        <div key={`${component.id}-${index}`} className="flex items-center justify-between text-sm text-purple-600 bg-white p-3 rounded border border-purple-200">
                          <div className="flex-1">
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-gray-600">
                              Capacity: {component.specifications?.capacity} | 
                              Type: {component.specifications?.type} | 
                              Interface: {component.specifications?.interface} | 
                              Hot Plug: {component.specifications?.hotPlug ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleComponentRemove('storage', component.id, index)}
                            className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Specifications</h3>
              
              {/* Component Selection Section */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-orange-900 mb-2">Select Network Components</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-1">Available Network Components</label>
                    {loadingComponents ? (
                      <div className="text-sm text-orange-600">Loading components...</div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const selected = availableComponents.network.find((comp: any) => comp.id === e.target.value);
                          if (selected) {
                            handleComponentSelect('network', selected);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Select a network component to add</option>
                        {availableComponents.network.map((component: any) => (
                          <option key={`${component.id}-${Math.random()}`} value={component.id}>
                            {component.name} - {component.specifications?.ports} ports - {component.specifications?.speed}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Selected Components List */}
                  {selectedComponents.network.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-orange-700">Selected Network Components ({selectedComponents.network.length})</label>
                      {selectedComponents.network.map((component: any, index: number) => (
                        <div key={`${component.id}-${index}`} className="flex items-center justify-between text-sm text-orange-600 bg-white p-3 rounded border border-orange-200">
                          <div className="flex-1">
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-gray-600">
                              Ports: {component.specifications?.ports} | 
                              Speed: {component.specifications?.speed} | 
                              Type: {component.specifications?.type}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleComponentRemove('network', component.id, index)}
                            className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'power' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Power Specifications</h3>
              
              {/* Component Selection Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Select Power Components</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Available Power Components</label>
                    {loadingComponents ? (
                      <div className="text-sm text-red-600">Loading components...</div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const selected = availableComponents.power.find((comp: any) => comp.id === e.target.value);
                          if (selected) {
                            handleComponentSelect('power', selected);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">Select a power component to add</option>
                        {availableComponents.power.map((component: any) => (
                          <option key={`${component.id}-${Math.random()}`} value={component.id}>
                            {component.name} - {component.specifications?.wattage}W - {component.specifications?.efficiency}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Selected Components List */}
                  {selectedComponents.power.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-red-700">Selected Power Components ({selectedComponents.power.length})</label>
                      {selectedComponents.power.map((component: any, index: number) => (
                        <div key={`${component.id}-${index}`} className="flex items-center justify-between text-sm text-red-600 bg-white p-3 rounded border border-red-200">
                          <div className="flex-1">
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-gray-600">
                              Wattage: {component.specifications?.wattage}W | 
                              Efficiency: {component.specifications?.efficiency} | 
                              Redundant: {component.specifications?.redundant ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleComponentRemove('power', component.id, index)}
                            className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Fill in the specifications to create detailed device compatibility profiles
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
            >
              Add Device Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDeviceDialog;
