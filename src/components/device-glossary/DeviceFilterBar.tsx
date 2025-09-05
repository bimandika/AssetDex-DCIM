import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeviceEnums } from '../../hooks/useBrandTypes';
import { useEnumContext } from '../../contexts/EnumContext';

interface DeviceFilterBarProps {
  manufacturer: string;
  type: string;
  status: string;
  year: string;
  onManufacturerChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onYearChange: (value: string) => void;
  manufacturers?: string[];
  years?: string[];
}

const DeviceFilterBar: React.FC<DeviceFilterBarProps> = ({
  manufacturer,
  type,
  status,
  year,
  onManufacturerChange,
  onTypeChange,
  onStatusChange,
  onYearChange,
  manufacturers, // Keep as optional prop for override
  years // Keep as optional prop for override
}) => {
  const { brands, deviceTypes, loading: enumsLoading } = useDeviceEnums();
  const { enums } = useEnumContext();
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Fetch available years from actual device data
  useEffect(() => {
    const fetchAvailableYears = async () => {
      setLoadingYears(true);
      try {
        const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
        const response = await fetch('http://localhost:8000/functions/v1/device-glossary', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const devices = Array.isArray(data) ? data : (data.devices || []);
          
          // Extract unique years from devices and sort them
          const uniqueYears = [...new Set(devices.map((device: any) => device.year?.toString()))]
            .filter((year): year is string => typeof year === 'string' && year !== 'null' && year !== 'undefined')
            .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending (newest first)
          
          setAvailableYears(uniqueYears);
        }
      } catch (error) {
        console.error('Error fetching years:', error);
        // Fallback to static years if API fails
        setAvailableYears(['2025', '2024', '2023', '2022', '2021']);
      } finally {
        setLoadingYears(false);
      }
    };

    fetchAvailableYears();
  }, []);

  // Use dynamic data if available, otherwise fallback to props or defaults
  const manufacturerOptions = manufacturers || brands || [];
  const yearOptions = years || enums.years || availableYears || [];
  const typeOptions = deviceTypes || ['Server', 'Storage', 'Network', 'Power'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <Select value={manufacturer} onValueChange={onManufacturerChange} disabled={enumsLoading}>
        <SelectTrigger>
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder={enumsLoading ? 'Loading...' : 'All Manufacturers'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Manufacturers</SelectItem>
          {manufacturerOptions.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={type} onValueChange={onTypeChange} disabled={enumsLoading}>
        <SelectTrigger>
          <SelectValue placeholder={enumsLoading ? 'Loading...' : 'All Types'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {typeOptions.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger>
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Ready">Ready</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
          <SelectItem value="Maintenance">Maintenance</SelectItem>
          <SelectItem value="Decommissioned">Decommissioned</SelectItem>
          <SelectItem value="Retired">Retired</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={year} onValueChange={onYearChange} disabled={loadingYears}>
        <SelectTrigger>
          <SelectValue placeholder={loadingYears ? 'Loading...' : 'All Years'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {yearOptions.map((y: string) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DeviceFilterBar;
