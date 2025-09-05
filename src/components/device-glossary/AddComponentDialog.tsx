import React, { useState } from 'react';
import { componentService } from '@/services/componentService';

interface AddComponentDialogProps {
  open: boolean;
  onClose: () => void;
  componentType: 'cpu' | 'memory' | 'power' | 'network' | 'storage';
  onComponentAdded: () => void;
}

const AddComponentDialog: React.FC<AddComponentDialogProps> = ({
  open,
  onClose,
  componentType,
  onComponentAdded
}) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const getFormFields = () => {
    switch (componentType) {
      case 'cpu':
        return [
          { name: 'cpu_model', label: 'CPU Model', type: 'text', required: true },
          { name: 'cpu_generation', label: 'Generation', type: 'text' },
          { name: 'physical_cores', label: 'Physical Cores', type: 'number' },
          { name: 'logical_cores', label: 'Logical Cores', type: 'number' },
          { name: 'base_frequency_ghz', label: 'Base Frequency (GHz)', type: 'number', step: '0.1' },
          { name: 'boost_frequency_ghz', label: 'Boost Frequency (GHz)', type: 'number', step: '0.1' },
          { name: 'cpu_architecture', label: 'Architecture', type: 'text' },
          { name: 'tdp_watts', label: 'TDP (Watts)', type: 'number' }
        ];
      case 'memory':
        return [
          { name: 'total_capacity_gb', label: 'Total Capacity (GB)', type: 'number', required: true },
          { name: 'memory_type', label: 'Memory Type', type: 'text', required: true },
          { name: 'memory_frequency_mhz', label: 'Frequency (MHz)', type: 'number' },
          { name: 'module_count', label: 'Module Count', type: 'number' },
          { name: 'module_capacity_gb', label: 'Module Capacity (GB)', type: 'number' },
          { name: 'ecc_support', label: 'ECC Support', type: 'checkbox' },
          { name: 'maximum_capacity_gb', label: 'Maximum Capacity (GB)', type: 'number' }
        ];
      case 'power':
        return [
          { name: 'max_power_watts', label: 'Max Power (Watts)', type: 'number', required: true },
          { name: 'power_cable_type', label: 'Cable Type', type: 'text' },
          { name: 'psu_slot_number', label: 'PSU Slot Number', type: 'number' }
        ];
      case 'network':
        return [
          { name: 'nic_manufacturer', label: 'Manufacturer', type: 'text' },
          { name: 'nic_model', label: 'Model', type: 'text', required: true },
          { name: 'port_quantity', label: 'Port Quantity', type: 'number' },
          { name: 'port_speed_gbps', label: 'Port Speed (Gbps)', type: 'number' },
          { name: 'port_type', label: 'Port Type', type: 'text' },
          { name: 'connector_type', label: 'Connector Type', type: 'text' }
        ];
      case 'storage':
        return [
          { name: 'storage_model', label: 'Storage Model', type: 'text', required: true },
          { name: 'storage_type', label: 'Storage Type', type: 'text', required: true },
          { name: 'capacity_gb', label: 'Capacity (GB)', type: 'number', required: true },
          { name: 'interface_type', label: 'Interface Type', type: 'text' },
          { name: 'drive_form_factor', label: 'Form Factor', type: 'text' },
          { name: 'hot_plug_support', label: 'Hot Plug Support', type: 'checkbox' },
          { name: 'performance_tier', label: 'Performance Tier', type: 'text' },
          { name: 'warranty_years', label: 'Warranty (Years)', type: 'number' },
          { name: 'quantity', label: 'Quantity', type: 'number' },
          { name: 'storage_slot_number', label: 'Slot Number', type: 'number' }
        ];
      default:
        return [];
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await componentService.createComponent(componentType, formData);
      onComponentAdded();
      onClose();
      setFormData({});
    } catch (error) {
      console.error('Error creating component:', error);
      alert('Failed to create component. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = getFormFields();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Add New {componentType.toUpperCase()} Component
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={formData[field.name] || false}
                    onChange={(e) => handleInputChange(field.name, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type={field.type}
                    step={field.step}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    required={field.required}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddComponentDialog;
