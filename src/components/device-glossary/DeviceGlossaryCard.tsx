import React from 'react';

interface DeviceGlossaryCardProps {
  device: {
    id: string;
    device_model: string;
    manufacturer: string;
    year: number;
    unit_height: string;
    device_type: string;
    status: string;
    description: string;
  };
  onViewDetails: () => void;
}

const DeviceGlossaryCard: React.FC<DeviceGlossaryCardProps> = ({ device, onViewDetails }) => {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
      <h2 className="text-lg font-bold mb-1">{device.device_model}</h2>
      <p className="text-sm text-gray-600 mb-2">{device.manufacturer} • {device.year} • {device.unit_height}</p>
      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mb-2">{device.device_type}</span>
      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mb-2 ml-2">{device.status}</span>
      <p className="text-gray-700 text-sm mt-2">{device.description}</p>
      <button 
        onClick={onViewDetails}
        className="mt-4 inline-block text-blue-600 hover:underline font-medium cursor-pointer"
      >
        View Details
      </button>
    </div>
  );
};

export default DeviceGlossaryCard;
