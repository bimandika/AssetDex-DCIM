import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DeviceGlossaryCard from './DeviceGlossaryCard';
import DeviceFilterBar from './DeviceFilterBar';
import DeviceSearchBar from './DeviceSearchBar';
import DeviceDetailView from './DeviceDetailView';
import DeviceGlossaryAdmin from './DeviceGlossaryAdmin';
import DeviceComparisonPage from '../comparison/ServerComparisonPage';
import { useAuth } from '@/hooks/useAuth';

const DeviceGlossaryList: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [manufacturer, setManufacturer] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { hasRole } = useAuth();

  // Check if user can access admin features (engineer or super_admin)
  const canManageDevices = hasRole('engineer');

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line
  }, [manufacturer, type, status, year, search]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (manufacturer && manufacturer !== 'all') params.append('manufacturer', manufacturer);
      if (type && type !== 'all') params.append('device_type', type);
      if (status && status !== 'all') params.append('status', status);
      if (year && year !== 'all') params.append('year', year);
      if (search) params.append('search', search);
      
      // Get authentication token from localStorage or session
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      const response = await fetch(`http://localhost:8000/functions/v1/device-glossary?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both formats: array or { devices: array }
        const devices = Array.isArray(data) ? data : (data.devices || []);
        setDevices(devices);
        console.log('Devices loaded:', devices.length, 'devices');
        console.log('Device models:', devices.map((d: any) => d.device_model));
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {selectedDevice ? (
        // Device Detail View
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Device Details</CardTitle>
                <CardDescription>Viewing specifications for {selectedDevice.device_model}</CardDescription>
              </div>
              <Button 
                onClick={() => setSelectedDevice(null)}
                variant="outline"
              >
                ← Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DeviceDetailView device={selectedDevice} />
          </CardContent>
        </Card>
      ) : showAdmin ? (
        // Admin View
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Device Glossary Administration</CardTitle>
                <CardDescription>Manage device specifications and hardware profiles</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  setShowAdmin(false);
                  fetchDevices(); // Refresh devices when returning from admin
                }}
                variant="outline"
              >
                ← Back to Glossary
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DeviceGlossaryAdmin />
          </CardContent>
        </Card>
      ) : showComparison ? (
        // Comparison View
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Device Comparison</CardTitle>
                <CardDescription>Compare hardware specifications side by side</CardDescription>
              </div>
              <Button 
                onClick={() => setShowComparison(false)}
                variant="outline"
              >
                ← Back to Glossary
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DeviceComparisonPage />
          </CardContent>
        </Card>
      ) : (
        // Main Device Glossary View
        <>
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Device Glossary</CardTitle>
                  <CardDescription>Comprehensive hardware specifications and compatibility information</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={fetchDevices}
                    variant="outline"
                    size="sm"
                    title="Refresh device list"
                  >
                    🔄 Refresh
                  </Button>
                  <Button 
                    onClick={() => setShowComparison(true)}
                    variant="outline"
                    size="sm"
                    title="Compare devices"
                  >
                    📊 Compare
                  </Button>
                  {canManageDevices && (
                    <Button 
                      onClick={() => setShowAdmin(true)}
                      variant="outline"
                      size="sm"
                    >
                      🔰 Admin Panel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters Card */}
          <Card>
            <CardContent className="pt-6">
              <DeviceFilterBar
                manufacturer={manufacturer}
                type={type}
                status={status}
                year={year}
                onManufacturerChange={setManufacturer}
                onTypeChange={setType}
                onStatusChange={setStatus}
                onYearChange={setYear}
              />
              <DeviceSearchBar query={search} setQuery={setSearch} />
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {devices.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500">No devices found.</div>
                  ) : (
                    devices.map(device => (
                      <DeviceGlossaryCard 
                        key={device.id} 
                        device={device} 
                        onViewDetails={() => setSelectedDevice(device)}
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DeviceGlossaryList;
