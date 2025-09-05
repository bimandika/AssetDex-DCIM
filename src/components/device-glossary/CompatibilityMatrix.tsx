import React from 'react';

interface CompatibilityMatrixProps {
  device: any;
  compatibility: any[];
}

const CompatibilityMatrix: React.FC<CompatibilityMatrixProps> = ({ device, compatibility }) => {
  return (
    <div className="space-y-4">
      {compatibility && compatibility.length > 0 ? (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compatible Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compatibility Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compatibility.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.compatible_device?.device_model || item.compatible_model || 'Unknown Model'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.compatibility_type || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.level === 'full' ? 'bg-green-100 text-green-800' :
                      item.level === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.level || 'Compatible'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.notes || 'No additional notes'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">🔗 Compatibility Information</h4>
            <div className="text-blue-800 space-y-2">
              <p>This device model has been designed for enterprise compatibility across various infrastructure components.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h5 className="font-semibold text-blue-900 mb-2">🏢 Rack Compatibility</h5>
                  <ul className="text-sm space-y-1">
                    <li>• Standard 19-inch rack mounting</li>
                    <li>• {device.unit_height} form factor</li>
                    <li>• Enterprise rack rail systems</li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h5 className="font-semibold text-blue-900 mb-2">⚡ Infrastructure</h5>
                  <ul className="text-sm space-y-1">
                    <li>• Standard data center power</li>
                    <li>• Enterprise networking</li>
                    <li>• Environmental monitoring</li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h5 className="font-semibold text-blue-900 mb-2">🔧 Management</h5>
                  <ul className="text-sm space-y-1">
                    <li>• DCIM software integration</li>
                    <li>• Remote management protocols</li>
                    <li>• Monitoring system compatibility</li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h5 className="font-semibold text-blue-900 mb-2">🌐 Ecosystem</h5>
                  <ul className="text-sm space-y-1">
                    <li>• Industry standard interfaces</li>
                    <li>• Vendor neutral design</li>
                    <li>• Future upgrade paths</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <p>📋 <strong>Note:</strong> Detailed compatibility matrices with specific models, components, and software can be configured through the Admin Panel. This includes testing results, certification status, and known compatibility issues.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompatibilityMatrix;
