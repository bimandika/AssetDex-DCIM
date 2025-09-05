import React from 'react';

interface ComparisonFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

const ComparisonFilters: React.FC<ComparisonFiltersProps> = ({ activeFilters, onFiltersChange }) => {
  const filterOptions = [
    { key: 'cpu', label: 'CPU Specifications' },
    { key: 'memory', label: 'Memory/RAM' },
    { key: 'storage', label: 'Storage' },
    { key: 'network', label: 'Network Interfaces' },
    { key: 'power', label: 'Power Supply' }
  ];

  const toggleFilter = (filterKey: string) => {
    const isActive = activeFilters.includes(filterKey);
    if (isActive) {
      onFiltersChange(activeFilters.filter(f => f !== filterKey));
    } else {
      onFiltersChange([...activeFilters, filterKey]);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="mb-3 font-bold">Comparison Categories</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {filterOptions.map(option => (
          <button
            key={option.key}
            onClick={() => toggleFilter(option.key)}
            className={`px-3 py-2 rounded text-sm transition-colors ${
              activeFilters.includes(option.key)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-3 text-sm text-gray-600">
        Selected {activeFilters.length} of {filterOptions.length} categories
      </div>
    </div>
  );
};

export default ComparisonFilters;
