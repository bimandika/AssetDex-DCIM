import React from 'react';
import { Download } from 'lucide-react';

interface ComparisonExportProps {
  models: string[];
  comparisonData: any;
}

const ComparisonExport: React.FC<ComparisonExportProps> = ({ models, comparisonData }) => {
  const exportToCSV = () => {
    if (!comparisonData) return;

    const modelData = Array.isArray(comparisonData) ? comparisonData : 
                      (comparisonData.models || comparisonData.devices || []);

    if (modelData.length === 0) return;

    // Get all unique keys from all models
    const allKeys = new Set<string>();
    modelData.forEach((model: any) => {
      Object.keys(model).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    modelData.forEach((model: any) => {
      const row = headers.map(header => {
        const value = model[header] || '';
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',');
      csvContent += row + '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `device-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!comparisonData || models.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-bold">Export Comparison</div>
          <div className="text-sm text-gray-600">Download comparison data as CSV</div>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default ComparisonExport;
