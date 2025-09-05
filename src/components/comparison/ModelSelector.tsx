import React, { useState, useEffect } from 'react';

interface ModelSelectorProps {
  selectedModels: string[];
  onModelSelect: (modelId: string) => void;
  onModelRemove?: (modelId: string) => void;
  maxSelection: number;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModels, onModelSelect, onModelRemove, maxSelection }) => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  console.log('ModelSelector props:', { selectedModels, maxSelection });

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      const res = await fetch('http://localhost:8000/functions/v1/device-glossary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Handle both formats: array or { devices: array }
        const devices = Array.isArray(data) ? data : (data.devices || []);
        console.log('ModelSelector loaded devices:', devices.length, 'devices');
        console.log('Sample device structure:', devices[0]);
        setModels(devices);
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="mb-2 font-bold">Select Models to Compare ({selectedModels.length}/{maxSelection})</div>
      {loading ? (
        <div className="text-center py-4">Loading models...</div>
      ) : models.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No server models found</div>
      ) : (
        <>
          {selectedModels.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Selected Models:</div>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map(modelId => {
                  const model = models.find(m => m.id === modelId);
                  return model ? (
                    <span key={modelId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {model.device_model} ({model.manufacturer})
                      <button
                        onClick={() => onModelRemove?.(modelId)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.isArray(models) && models
              .filter(m => !selectedModels.includes(m.id))
              .map(m => (
                <button
                  key={m.id}
                  className="border rounded px-3 py-2 bg-gray-50 hover:bg-blue-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedModels.length >= maxSelection}
                  onClick={() => onModelSelect(m.id)}
                >
                  <div className="font-medium">{m.device_model}</div>
                  <div className="text-sm text-gray-600">{m.manufacturer} • {m.device_type} • {m.year || 'N/A'}</div>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
