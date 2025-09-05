import React, { useState, useEffect } from 'react';
import { componentService } from '@/services/componentService';

interface EditSpecificationsDialogProps {
  open: boolean;
  device: any;
  onClose: () => void;
  onSave: (specs: any) => void;
}

const EditSpecificationsDialog: React.FC<EditSpecificationsDialogProps> = ({ open, device, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('cpu');
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
  const [formData, setFormData] = useState({
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
      speed: '',
      form_factor: 'RDIMM',
      ecc_support: true
    },
    storage_specs: {
      storage_bays: '',
      controller_type: '',
      hot_swap: false
    },
    network_specs: {
      ethernet_ports: '',
      port_speed: '1GbE',
      expansion_slots: '',
      management_port: false
    },
    power_specs: {
      psu_wattage: '',
      psu_efficiency: '80+ Bronze',
      power_consumption_idle: '',
      power_consumption_max: '',
      redundant_psu: false
    }
  });

  // Load available components from the database
  const loadAvailableComponents = async () => {
    if (!open) return;
    
    setLoadingComponents(true);
    try {
      const componentTypes = ['cpu', 'memory', 'storage', 'network', 'power'];
      const componentData: any = {
        cpu: [],
        memory: [],
        storage: [],
        network: [],
        power: []
      };
      
      for (const type of componentTypes) {
        try {
          const result = await componentService.getComponents(type, 0, 100);
          
          if (type === 'storage') {
            // For storage, group by unique specifications to avoid showing duplicates
            // from the same storage model across different devices
            const uniqueStorage = result.data.reduce((unique: any[], storage: any) => {
              const key = `${storage.storage_model}_${storage.storage_type}_${storage.capacity_gb}_${storage.interface_type}`;
              if (!unique.find(s => `${s.storage_model}_${s.storage_type}_${s.capacity_gb}_${s.interface_type}` === key)) {
                // Add a display name for better UX
                storage.name = storage.name || `${storage.storage_model} ${storage.capacity_gb}GB ${storage.storage_type}`;
                unique.push(storage);
              }
              return unique;
            }, []);
            componentData[type] = uniqueStorage;
          } else {
            componentData[type] = result.data;
          }
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

  useEffect(() => {
    loadAvailableComponents();
  }, [open]);

  useEffect(() => {
    if (device) {
      // Load device specifications
      if (device.specifications) {
        setFormData({
          cpu_specs: device.specifications.cpu_specs || formData.cpu_specs,
          memory_specs: device.specifications.memory_specs || formData.memory_specs,
          storage_specs: device.specifications.storage_specs || formData.storage_specs,
          network_specs: device.specifications.network_specs || formData.network_specs,
          power_specs: device.specifications.power_specs || formData.power_specs,
        });
      }

      // Load existing device components - always initialize arrays
      setSelectedComponents({
        cpu: (device.components?.cpu) || [],
        memory: (device.components?.memory) || [],
        storage: (device.components?.storage) || [],
        network: (device.components?.network) || [],
        power: (device.components?.power) || []
      });
    } else {
      // If no device, reset to empty arrays
      setSelectedComponents({
        cpu: [],
        memory: [],
        storage: [],
        network: [],
        power: []
      });
    }
  }, [device]);

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

  const handleSubmit = () => {
    const updatedSpecs = {
      ...formData,
      // Include selected components
      components: {
        cpu: selectedComponents.cpu,
        memory: selectedComponents.memory,
        storage: selectedComponents.storage,
        network: selectedComponents.network,
        power: selectedComponents.power
      }
    };
    onSave(updatedSpecs);
    onClose();
  };

  if (!open) return null;

  const tabs = [
    { id: 'cpu', label: 'CPU', color: 'bg-blue-500' },
    { id: 'memory', label: 'Memory', color: 'bg-green-500' },
    { id: 'storage', label: 'Storage', color: 'bg-purple-500' },
    { id: 'network', label: 'Network', color: 'bg-orange-500' },
    { id: 'power', label: 'Power', color: 'bg-red-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold">Edit Specifications</h2>
          <p className="text-gray-600 mt-1">Update hardware specifications for {device?.device_model}</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${tab.color} mr-2 opacity-75`}></div>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
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
                            {component.storage_model} - {component.capacity_gb}GB {component.storage_type} ({component.interface_type})
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
                            <div className="font-medium">{component.storage_model || component.name}</div>
                            <div className="text-xs text-gray-600">
                              Capacity: {component.capacity_gb}GB | 
                              Type: {component.storage_type} | 
                              Interface: {component.interface_type} | 
                              Hot Plug: {component.hot_plug_support ? 'Yes' : 'No'}
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
            Update the specifications for this device model
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSpecificationsDialog;
