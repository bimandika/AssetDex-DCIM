// src/components/dashboard/FilterDropdown.tsx
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface FilterDropdownProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[]; // Optional: for enums, etc.
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ field, value, onChange, options }) => {
  // If options are provided, use dropdown; else use text input
  return options ? (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={`Filter by ${field}`}
      className="border rounded px-2 py-1"
    />
  );
};

export default FilterDropdown;
