import React, { useState, useEffect } from 'react';
import { componentService, ComponentItem } from '@/services/componentService';
import AddComponentDialog from './AddComponentDialog';

interface ComponentManagementDialogProps {
  open: boolean;
  onClose: () => void;
  componentType: 'cpu' | 'memory' | 'power' | 'network' | 'storage';
  title: string;
}

const ComponentManagementDialog: React.FC<ComponentManagementDialogProps> = ({ 
  open, 
  onClose, 
  componentType, 
  title 
}) => {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchComponents();
    }
  }, [open, componentType]);

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const response = await componentService.getComponents(componentType);
      setComponents(response.data);
    } catch (error) {
      console.error('Error fetching components:', error);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = () => {
    setAddDialogOpen(true);
  };

  const handleComponentAdded = () => {
    fetchComponents(); // Refresh the component list
  };

  const handleEditComponent = (component: ComponentItem) => {
    // TODO: Implement edit component dialog
    alert(`Edit ${component.name} functionality - integrate with componentService.updateComponent()`);
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      try {
        await componentService.deleteComponent(componentType, componentId);
        setComponents(prev => prev.filter(c => c.id !== componentId));
      } catch (error) {
        console.error('Error deleting component:', error);
        alert('Failed to delete component. Please try again.');
      }
    }
  };

  if (!open) return null;

  const getColorClasses = () => {
    switch (componentType) {
      case 'cpu':
        return {
          headerBg: 'bg-blue-50',
          titleText: 'text-blue-900',
          descText: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700',
          badge: 'bg-blue-100 text-blue-700',
          accent: 'border-blue-200',
          cardBorder: 'border-blue-200',
          specsBg: 'bg-blue-100',
          specsText: 'text-blue-700'
        };
      case 'memory':
        return {
          headerBg: 'bg-green-50',
          titleText: 'text-green-900',
          descText: 'text-green-700',
          button: 'bg-green-600 hover:bg-green-700',
          badge: 'bg-green-100 text-green-700',
          accent: 'border-green-200',
          cardBorder: 'border-green-200',
          specsBg: 'bg-green-100',
          specsText: 'text-green-700'
        };
      case 'power':
        return {
          headerBg: 'bg-yellow-50',
          titleText: 'text-yellow-900',
          descText: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          badge: 'bg-yellow-100 text-yellow-700',
          accent: 'border-yellow-200',
          cardBorder: 'border-yellow-200',
          specsBg: 'bg-yellow-100',
          specsText: 'text-yellow-700'
        };
      case 'network':
        return {
          headerBg: 'bg-purple-50',
          titleText: 'text-purple-900',
          descText: 'text-purple-700',
          button: 'bg-purple-600 hover:bg-purple-700',
          badge: 'bg-purple-100 text-purple-700',
          accent: 'border-purple-200',
          cardBorder: 'border-purple-200',
          specsBg: 'bg-purple-100',
          specsText: 'text-purple-700'
        };
      case 'storage':
        return {
          headerBg: 'bg-orange-50',
          titleText: 'text-orange-900',
          descText: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700',
          badge: 'bg-orange-100 text-orange-700',
          accent: 'border-orange-200',
          cardBorder: 'border-orange-200',
          specsBg: 'bg-orange-100',
          specsText: 'text-orange-700'
        };
      default:
        return {
          headerBg: 'bg-gray-50',
          titleText: 'text-gray-900',
          descText: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700',
          badge: 'bg-gray-100 text-gray-700',
          accent: 'border-gray-200',
          cardBorder: 'border-gray-200',
          specsBg: 'bg-gray-100',
          specsText: 'text-gray-700'
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className={`border-b border-gray-200 px-6 py-4 ${colorClasses.headerBg}`}>
          <h2 className={`text-2xl font-bold ${colorClasses.titleText}`}>{title}</h2>
          <p className={`${colorClasses.descText} mt-1`}>
            Manage hardware {componentType} specifications and models
          </p>
        </div>

        {/* Action Bar */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {components.length} {componentType} component{components.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={handleAddComponent}
              className={`px-4 py-2 ${colorClasses.button} text-white rounded-md transition font-medium`}
            >
              Add New {componentType.toUpperCase()} Component
            </button>
          </div>
        </div>

        {/* Component List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading {componentType} components...</div>
            </div>
          ) : components.length === 0 ? (
            <div className="text-center py-12">
              <div className={`${colorClasses.titleText} text-lg font-medium mb-2`}>
                No {componentType} components found
              </div>
              <div className="text-gray-500 mb-4">
                Start by adding your first {componentType} component specification
              </div>
              <button
                onClick={handleAddComponent}
                className={`px-6 py-3 ${colorClasses.button} text-white rounded-md transition font-medium`}
              >
                Add First {componentType.toUpperCase()} Component
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Component Fields Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-3">Component Name</div>
                <div className="col-span-6">Key Specifications</div>
                <div className="col-span-2">Last Updated</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Component List */}
              {components.map((component) => (
                <div key={component.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 hover:bg-gray-50">
                  <div className="col-span-3">
                    <div className="font-medium text-gray-900">{component.name}</div>
                    <div className="text-sm text-gray-500">ID: {component.id}</div>
                  </div>
                  <div className="col-span-6">
                    <div className="flex flex-wrap gap-2">
                      {component.specifications && Object.entries(component.specifications).slice(0, 3).map(([key, value]) => (
                        <span key={key} className={`px-2 py-1 ${colorClasses.specsBg} ${colorClasses.specsText} text-xs rounded`}>
                          {key}: {String(value) || 'N/A'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-500">
                    {new Date(component.updated_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditComponent(component)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(component.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Use component management to define hardware specifications and compatibility matrices
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add Component Dialog */}
      <AddComponentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        componentType={componentType}
        onComponentAdded={handleComponentAdded}
      />
    </div>
  );
};

export default ComponentManagementDialog;
