import React, { useEffect, useState } from 'react';
import SpecificationTabs from './SpecificationTabs';
import CompatibilityMatrix from './CompatibilityMatrix';

interface DeviceDetailViewProps {
  device: any;
}

const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({ device }) => {
  const [specs, setSpecs] = useState<any>({});
  const [compatibility, setCompatibility] = useState<any[]>([]);

  useEffect(() => {
    if (device?.id) {
      fetchSpecs();
      fetchCompatibility();
    }
    // eslint-disable-next-line
  }, [device?.id]);

  const fetchSpecs = async () => {
    if (!device?.id) return;
    
    try {
      // Get authentication token from localStorage or session
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const res = await fetch(`http://localhost:8000/functions/v1/device-glossary/${device.id}/complete-specs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setSpecs(res.ok ? await res.json() : {});
    } catch {
      setSpecs({});
    }
  };

  const fetchCompatibility = async () => {
    if (!device?.id) return;
    
    try {
      // Get authentication token from localStorage or session
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const res = await fetch(`http://localhost:8000/functions/v1/device-glossary/${device.id}/compatibility`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setCompatibility(res.ok ? await res.json() : []);
    } catch {
      setCompatibility([]);
    }
  };

  if (!device) return <div className="container mx-auto p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Device Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{device.device_model}</h1>
            <div className="flex items-center space-x-4 text-gray-600 mb-4">
              <span className="flex items-center">
                <span className="font-medium">Manufacturer:</span>
                <span className="ml-2">{device.manufacturer}</span>
              </span>
              <span className="flex items-center">
                <span className="font-medium">Year:</span>
                <span className="ml-2">{device.year}</span>
              </span>
              <span className="flex items-center">
                <span className="font-medium">Unit Height:</span>
                <span className="ml-2">{device.unit_height}</span>
              </span>
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {device.device_type}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {device.status}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed">{device.description}</p>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Specifications</h2>
        <SpecificationTabs specs={specs} />
      </div>

      {/* Compatibility */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Compatibility Information</h2>
        <CompatibilityMatrix device={device} compatibility={compatibility} />
      </div>
    </div>
  );
};

export default DeviceDetailView;
