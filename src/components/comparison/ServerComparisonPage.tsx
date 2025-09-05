import React, { useState, useEffect } from 'react';
import ComparisonTable from './ComparisonTable';
import ModelSelector from './ModelSelector';
import ComparisonFilters from './ComparisonFilters';
import ComparisonExport from './ComparisonExport';

const DeviceComparisonPage: React.FC = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(['cpu', 'memory', 'storage', 'network', 'power']);

  useEffect(() => {
    console.log('Effect triggered:', { selectedModelsLength: selectedModels.length, selectedModels, activeFilters });
    if (selectedModels.length >= 2) {
      loadComparison();
    } else {
      setComparisonData(null);
    }
    // eslint-disable-next-line
  }, [selectedModels, activeFilters]);

  const handleModelSelect = (modelId: string) => {
    if (!selectedModels.includes(modelId)) {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const handleModelRemove = (modelId: string) => {
    setSelectedModels(selectedModels.filter(id => id !== modelId));
  };

  const loadComparison = async () => {
    setLoading(true);
    try {
      console.log('Loading comparison for models:', selectedModels);
      const modelsQuery = selectedModels.join(',');
      const filtersQuery = activeFilters.join(',');
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      // Try comparison endpoint first
      const res = await fetch(`http://localhost:8000/functions/v1/device-glossary/compare?models=${modelsQuery}&include=${filtersQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Comparison API data:', data);
        
        // Transform comparison API response to match ComparisonTable expected format
        if (data.models && data.specifications) {
          const transformedData = data.models.map((model: any, index: number) => {
            const cpu = data.specifications.cpu[index];
            const memory = data.specifications.memory[index];
            const storage = data.specifications.storage[index] || [];
            const network = data.specifications.network[index] || [];
            const power = data.specifications.power[index] || [];
            
            return {
              ...model,
              // CPU specifications (enhanced for multiple CPUs)
              cpu_model: cpu?.cpu_model || 'N/A',
              cpu_cores: cpu?.physical_cores ? 
                (cpu.cpu_quantity > 1 ? `${cpu.physical_cores * cpu.cpu_quantity} (${cpu.cpu_quantity}x ${cpu.physical_cores})` : cpu.physical_cores) : 'N/A',
              cpu_threads: cpu?.logical_cores ? 
                (cpu.cpu_quantity > 1 ? `${cpu.logical_cores * cpu.cpu_quantity} (${cpu.cpu_quantity}x ${cpu.logical_cores})` : cpu.logical_cores) : 'N/A',
              cpu_base_frequency: cpu?.base_frequency_ghz ? `${cpu.base_frequency_ghz} GHz` : 'N/A',
              cpu_max_frequency: cpu?.boost_frequency_ghz ? `${cpu.boost_frequency_ghz} GHz` : 'N/A',
              
              // Memory specifications (enhanced display)
              memory_total: memory?.total_capacity_gb ? `${memory.total_capacity_gb} GB` : 'N/A',
              memory_type: memory?.memory_type || 'N/A',
              memory_speed: memory?.memory_frequency_mhz ? `${memory.memory_frequency_mhz} MHz` : 'N/A',
              memory_slots_total: memory?.module_count ? 
                (memory.module_capacity_gb ? `${memory.module_count} (${memory.module_capacity_gb}GB each)` : memory.module_count) : 'N/A',
              memory_slots_used: memory?.module_count ? 
                (memory.module_capacity_gb ? `${memory.module_count} (${memory.module_capacity_gb}GB each)` : memory.module_count) : 'N/A',
              
              // Storage specifications (compact summary for many drives)
              storage_total: storage.length > 0 ? 
                `${storage.reduce((total: number, s: any) => total + (s.capacity_gb || 0), 0)} GB` : 'N/A',
              storage_type: storage.length > 0 ? 
                [...new Set(storage.map((s: any) => s.storage_type))].join(', ') : 'N/A',
              storage_interface: storage.length > 0 ? 
                [...new Set(storage.map((s: any) => s.interface_type))].join(', ') : 'N/A',
              storage_breakdown: storage.length > 0 ? 
                (() => {
                  // Group storage by type and interface for compact display
                  const grouped = storage.reduce((acc: any, s: any) => {
                    const key = `${s.storage_type}_${s.interface_type}`;
                    if (!acc[key]) {
                      acc[key] = { 
                        count: 0, 
                        capacity: s.capacity_gb, 
                        type: s.storage_type, 
                        interface: s.interface_type 
                      };
                    }
                    acc[key].count += (s.quantity || 1);
                    return acc;
                  }, {});
                  
                  return Object.values(grouped).map((group: any) => 
                    `${group.count}x ${group.capacity}GB ${group.type} (${group.interface})`
                  ).join(' + ');
                })() : 'N/A',
              storage_drives_count: storage.reduce((count: number, s: any) => count + (s.quantity || 1), 0) || 0,
              
              // Network specifications (compact summary for many NICs)
              network_interfaces: network.length > 0 ?
                (() => {
                  // Group NICs by speed and type for compact display
                  const grouped = network.reduce((acc: any, nic: any) => {
                    const key = `${nic.port_speed_gbps}Gbps_${nic.nic_type}`;
                    if (!acc[key]) {
                      acc[key] = { 
                        ports: 0, 
                        speed: nic.port_speed_gbps, 
                        type: nic.nic_type 
                      };
                    }
                    acc[key].ports += (nic.port_quantity || 1);
                    return acc;
                  }, {});
                  
                  return Object.values(grouped).map((group: any) => 
                    `${group.ports}x ${group.speed}Gbps ${group.type}`
                  ).join(' + ');
                })() : 'N/A',
              network_speed: network.length > 0 ?
                [...new Set(network.map((nic: any) => `${nic.port_speed_gbps}Gbps`))].join(', ') : 'N/A',
              network_types: network.length > 0 ?
                [...new Set(network.map((nic: any) => nic.nic_type))].join(', ') : 'N/A',
              network_total_ports: network.reduce((total: number, nic: any) => total + (nic.port_quantity || 1), 0) || 0,
              
              // Power specifications (handle multiple PSUs)
              power_consumption: power.length > 0 ? 
                (() => {
                  const totalWatts = power.reduce((sum: number, psu: any) => sum + (psu.max_power_watts || 0), 0);
                  const psuCount = power.length;
                  return psuCount > 1 ? `${totalWatts}W (${psuCount} PSUs)` : `${totalWatts}W`;
                })() : 'N/A',
              power_supply_wattage: power.length > 0 ? 
                (() => {
                  const totalWatts = power.reduce((sum: number, psu: any) => sum + (psu.max_power_watts || 0), 0);
                  const psuCount = power.length;
                  return psuCount > 1 ? `${totalWatts}W (${psuCount} PSUs)` : `${totalWatts}W`;
                })() : 'N/A',
              power_efficiency: '80+ Bronze', // Default since not stored
            };
          });
          
          console.log('Transformed comparison data:', transformedData);
          setComparisonData(transformedData);
        } else {
          setComparisonData(data);
        }
      } else {
        console.log('Comparison API failed, using fallback:', res.status);
        // Fallback: fetch individual models for comparison
        await loadIndividualModelsForComparison();
      }
    } catch (error) {
      console.error('Error loading comparison:', error);
      // Fallback: fetch individual models for comparison
      await loadIndividualModelsForComparison();
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualModelsForComparison = async () => {
    try {
      console.log('Using fallback: fetching individual models with complete specs');
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      // Fetch complete specifications for each selected model
      const modelPromises = selectedModels.map(async modelId => {
        try {
          const res = await fetch(`http://localhost:8000/functions/v1/device-glossary/${modelId}/complete-specs`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log('Individual model spec data:', data);
            
            // Transform nested specifications to flat structure for comparison
            const flattenedDevice = {
              ...data.device,
              // CPU specifications (enhanced for multiple CPUs)
              cpu_model: data.specifications.cpu?.cpu_model || 'N/A',
              cpu_cores: data.specifications.cpu?.physical_cores ? 
                (data.specifications.cpu.cpu_quantity > 1 ? 
                  `${data.specifications.cpu.physical_cores * data.specifications.cpu.cpu_quantity} (${data.specifications.cpu.cpu_quantity}x ${data.specifications.cpu.physical_cores})` : 
                  data.specifications.cpu.physical_cores) : 'N/A',
              cpu_threads: data.specifications.cpu?.logical_cores ? 
                (data.specifications.cpu.cpu_quantity > 1 ? 
                  `${data.specifications.cpu.logical_cores * data.specifications.cpu.cpu_quantity} (${data.specifications.cpu.cpu_quantity}x ${data.specifications.cpu.logical_cores})` : 
                  data.specifications.cpu.logical_cores) : 'N/A',
              cpu_base_frequency: data.specifications.cpu?.base_frequency_ghz ? `${data.specifications.cpu.base_frequency_ghz} GHz` : 'N/A',
              cpu_max_frequency: data.specifications.cpu?.boost_frequency_ghz ? `${data.specifications.cpu.boost_frequency_ghz} GHz` : 'N/A',
              
              // Memory specifications (enhanced display)
              memory_total: data.specifications.memory?.total_capacity_gb ? `${data.specifications.memory.total_capacity_gb} GB` : 'N/A',
              memory_type: data.specifications.memory?.memory_type || 'N/A',
              memory_speed: data.specifications.memory?.memory_frequency_mhz ? `${data.specifications.memory.memory_frequency_mhz} MHz` : 'N/A',
              memory_slots_total: data.specifications.memory?.module_count ? 
                (data.specifications.memory.module_capacity_gb ? 
                  `${data.specifications.memory.module_count} (${data.specifications.memory.module_capacity_gb}GB each)` : 
                  data.specifications.memory.module_count) : 'N/A',
              memory_slots_used: data.specifications.memory?.module_count ? 
                (data.specifications.memory.module_capacity_gb ? 
                  `${data.specifications.memory.module_count} (${data.specifications.memory.module_capacity_gb}GB each)` : 
                  data.specifications.memory.module_count) : 'N/A',
              
              // Storage specifications (compact summary for many drives)
              storage_total: data.specifications.storage?.length > 0 ? 
                `${data.specifications.storage.reduce((total: number, storage: any) => total + (storage.capacity_gb || 0), 0)} GB` : 'N/A',
              storage_type: data.specifications.storage?.length > 0 ? 
                [...new Set(data.specifications.storage.map((s: any) => s.storage_type))].join(', ') : 'N/A',
              storage_interface: data.specifications.storage?.length > 0 ? 
                [...new Set(data.specifications.storage.map((s: any) => s.interface_type))].join(', ') : 'N/A',
              storage_breakdown: data.specifications.storage?.length > 0 ? 
                (() => {
                  const storage = data.specifications.storage;
                  // Group storage by type and interface for compact display
                  const grouped = storage.reduce((acc: any, s: any) => {
                    const key = `${s.storage_type}_${s.interface_type}`;
                    if (!acc[key]) {
                      acc[key] = { 
                        count: 0, 
                        capacity: s.capacity_gb, 
                        type: s.storage_type, 
                        interface: s.interface_type 
                      };
                    }
                    acc[key].count += (s.quantity || 1);
                    return acc;
                  }, {});
                  
                  return Object.values(grouped).map((group: any) => 
                    `${group.count}x ${group.capacity}GB ${group.type} (${group.interface})`
                  ).join(' + ');
                })() : 'N/A',
              storage_drives_count: data.specifications.storage?.reduce((count: number, storage: any) => count + (storage.quantity || 1), 0) || 0,
              
              // Network specifications (compact summary for many NICs)
              network_interfaces: data.specifications.network?.length > 0 ?
                (() => {
                  const network = data.specifications.network;
                  // Group NICs by speed and type for compact display
                  const grouped = network.reduce((acc: any, nic: any) => {
                    const key = `${nic.port_speed_gbps}Gbps_${nic.nic_type}`;
                    if (!acc[key]) {
                      acc[key] = { 
                        ports: 0, 
                        speed: nic.port_speed_gbps, 
                        type: nic.nic_type 
                      };
                    }
                    acc[key].ports += (nic.port_quantity || 1);
                    return acc;
                  }, {});
                  
                  return Object.values(grouped).map((group: any) => 
                    `${group.ports}x ${group.speed}Gbps ${group.type}`
                  ).join(' + ');
                })() : 'N/A',
              network_speed: data.specifications.network?.length > 0 ?
                [...new Set(data.specifications.network.map((nic: any) => `${nic.port_speed_gbps}Gbps`))].join(', ') : 'N/A',
              network_types: data.specifications.network?.length > 0 ?
                [...new Set(data.specifications.network.map((nic: any) => nic.nic_type))].join(', ') : 'N/A',
              network_total_ports: data.specifications.network?.reduce((total: number, nic: any) => total + (nic.port_quantity || 1), 0) || 0,
              
              // Power specifications (handle multiple PSUs)
              power_consumption: data.specifications.power?.length > 0 ? 
                (() => {
                  const power = data.specifications.power;
                  const totalWatts = power.reduce((sum: number, psu: any) => sum + (psu.max_power_watts || 0), 0);
                  const psuCount = power.length;
                  return psuCount > 1 ? `${totalWatts}W (${psuCount} PSUs)` : `${totalWatts}W`;
                })() : 'N/A',
              power_supply_wattage: data.specifications.power?.length > 0 ? 
                (() => {
                  const power = data.specifications.power;
                  const totalWatts = power.reduce((sum: number, psu: any) => sum + (psu.max_power_watts || 0), 0);
                  const psuCount = power.length;
                  return psuCount > 1 ? `${totalWatts}W (${psuCount} PSUs)` : `${totalWatts}W`;
                })() : 'N/A',
              power_efficiency: '80+ Bronze', // Default since not stored
            };
            
            return flattenedDevice;
          }
          return null;
        } catch (error) {
          console.error(`Error fetching specs for model ${modelId}:`, error);
          return null;
        }
      });
      
      const models = await Promise.all(modelPromises);
      const validModels = models.filter(model => model !== null);
      
      console.log('Flattened models for comparison:', validModels);
      
      if (validModels.length > 0) {
        setComparisonData(validModels);
      } else {
        console.log('No valid models found for comparison');
        setComparisonData(null);
      }
    } catch (error) {
      console.error('Error in fallback comparison:', error);
      setComparisonData(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModelSelector 
        selectedModels={selectedModels} 
        onModelSelect={handleModelSelect}
        onModelRemove={handleModelRemove}
        maxSelection={4} 
      />
      <ComparisonFilters activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
      
      {/* Debug Info */}
      {selectedModels.length >= 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <div className="text-sm text-blue-800">
            <strong>Debug:</strong> Selected {selectedModels.length} models: {selectedModels.join(', ')}
          </div>
          <button 
            onClick={() => loadComparison()}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            🔄 Refresh Comparison
          </button>
        </div>
      )}
      
      {loading ? <div className="text-center py-8">Loading...</div> : null}
      {comparisonData && !loading && <ComparisonTable comparisonData={comparisonData} activeFilters={activeFilters} />}
      {comparisonData && <ComparisonExport models={selectedModels} comparisonData={comparisonData} />}
    </div>
  );
};

export default DeviceComparisonPage;
