import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DeviceSearchBarProps {
  query: string;
  setQuery: (value: string) => void;
}

const DeviceSearchBar: React.FC<DeviceSearchBarProps> = ({ query, setQuery }) => {
  return (
    <div className="mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search device models, manufacturer, specs..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
};

export default DeviceSearchBar;
