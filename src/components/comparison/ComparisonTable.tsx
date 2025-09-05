import React from 'react';
import DifferenceHighlighter from './DifferenceHighlighter';

interface ComparisonTableProps {
  comparisonData: any;
  activeFilters: string[];
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparisonData, activeFilters }) => {
  console.log('ComparisonTable received:', { comparisonData, activeFilters });
  
  // Helper function for better field display names
  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      'storage_breakdown': 'Storage Configuration',
      'storage_total': 'Total Storage Capacity',
      'storage_drives_count': 'Number of Drives',
      'storage_type': 'Storage Types',
      'storage_interface': 'Storage Interfaces',
      'network_interfaces': 'Network Configuration',
      'network_speed': 'Network Speeds',
      'network_types': 'Network Interface Types',
      'network_total_ports': 'Total Network Ports',
      'cpu_base_frequency': 'CPU Base Frequency',
      'cpu_max_frequency': 'CPU Max Frequency',
      'memory_slots_total': 'Total Memory Slots',
      'memory_slots_used': 'Memory Slots Used',
      'power_supply_wattage': 'Power Supply Wattage',
      'power_consumption': 'Power Consumption'
    };
    
    return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Handle case where comparisonData might not be in expected format
  if (!comparisonData) {
    return (
      <div className="border rounded-lg p-4">
        <div className="text-center py-8 text-gray-500">
          Select at least 2 models to see comparison
        </div>
      </div>
    );
  }

  // Extract models from comparison data
  const models = Array.isArray(comparisonData) ? comparisonData : 
                 (comparisonData.models || comparisonData.devices || []);

  console.log('Extracted models for comparison:', models);

  if (!Array.isArray(models) || models.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <div className="text-center py-8">
          <div className="text-gray-500">No comparison data available</div>
          <div className="text-sm text-gray-400 mt-2">
            Debug: Received data type: {typeof comparisonData}, Array: {Array.isArray(comparisonData) ? 'yes' : 'no'}
          </div>
        </div>
      </div>
    );
  }

  // Define comparison sections based on active filters
  const comparisonSections = [
    {
      key: 'basic',
      title: 'Basic Information',
      fields: ['device_model', 'manufacturer', 'year', 'device_type', 'status']
    },
    {
      key: 'cpu',
      title: 'CPU Specifications',
      fields: ['cpu_model', 'cpu_cores', 'cpu_threads', 'cpu_base_frequency', 'cpu_max_frequency']
    },
    {
      key: 'memory',
      title: 'Memory Specifications',
      fields: ['memory_total', 'memory_type', 'memory_speed', 'memory_slots_total', 'memory_slots_used']
    },
    {
      key: 'storage',
      title: 'Storage Information',
      fields: ['storage_breakdown', 'storage_total', 'storage_drives_count', 'storage_type', 'storage_interface']
    },
    {
      key: 'network',
      title: 'Network Interfaces',
      fields: ['network_interfaces', 'network_total_ports', 'network_speed', 'network_types']
    },
    {
      key: 'power',
      title: 'Power Supply',
      fields: ['power_consumption', 'power_supply_wattage', 'power_efficiency']
    }
  ].filter(section => section.key === 'basic' || activeFilters.includes(section.key));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 p-4 font-bold">Device Comparison</div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-medium min-w-[200px]">Specification</th>
              {models.map((model: any, index: number) => (
                <th key={index} className="text-left p-3 font-medium min-w-[180px]">
                  <div>{model.device_model || `Model ${index + 1}`}</div>
                  <div className="text-sm text-gray-600 font-normal">
                    {model.manufacturer} {model.year && `(${model.year})`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonSections.map((section) => (
              <React.Fragment key={section.key}>
                <tr>
                  <td colSpan={models.length + 1} className="bg-blue-50 p-3 font-semibold text-blue-800">
                    {section.title}
                  </td>
                </tr>
                {section.fields.map((field) => {
                  // Check if values are different across models for this field
                  const values = models.map((model: any) => model[field]);
                  const uniqueValues = [...new Set(values.filter(v => v != null))];
                  const hasDifferences = uniqueValues.length > 1;

                  return (
                    <tr key={field} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium capitalize">
                        {getFieldDisplayName(field)}
                      </td>
                      {models.map((model: any, index: number) => (
                        <td key={index} className="p-3 align-top">
                          {model[field] ? (
                            <div className={`${
                              field === 'storage_breakdown' || field === 'network_interfaces' 
                                ? 'text-sm break-words max-w-xs' 
                                : ''
                            }`}>
                              <DifferenceHighlighter
                                value={model[field]}
                                isDifferent={hasDifferences && uniqueValues.length > 1}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
