// Example React Component for Adding Racks with Power Specifications
// This shows how the UI should collect KVA and power factor when creating racks

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PowerConfig {
  name: string;
  kva: number;
  powerFactor: number;
  description: string;
}

const COMMON_POWER_CONFIGS: PowerConfig[] = [
  { name: "Standard 20A@208V", kva: 4.2, powerFactor: 0.8, description: "Single 20A 208V circuit" },
  { name: "Standard 30A@208V", kva: 6.2, powerFactor: 0.8, description: "Single 30A 208V circuit" },
  { name: "Dual 20A@208V", kva: 8.3, powerFactor: 0.8, description: "Dual 20A 208V circuits" },
  { name: "High Density 30A@208V", kva: 12.5, powerFactor: 0.8, description: "Dual 30A 208V circuits" },
  { name: "Enterprise 60A@208V", kva: 25.0, powerFactor: 0.8, description: "High density enterprise rack" },
  { name: "Custom", kva: 0, powerFactor: 0.8, description: "Enter custom values" }
];

export const AddRackWithPowerForm = () => {
  const [formData, setFormData] = useState({
    rackName: '',
    dcSite: '',
    dcBuilding: '',
    dcFloor: '',
    dcRoom: '',
    powerConfigPreset: '',
    powerCapacityKva: '',
    powerFactor: '0.8',
    description: ''
  });

  const [calculatedWatts, setCalculatedWatts] = useState(0);

  // Calculate watts when KVA or power factor changes
  React.useEffect(() => {
    const kva = parseFloat(formData.powerCapacityKva) || 0;
    const pf = parseFloat(formData.powerFactor) || 0.8;
    setCalculatedWatts(Math.round(kva * pf * 1000));
  }, [formData.powerCapacityKva, formData.powerFactor]);

  const handlePresetChange = (presetName: string) => {
    const preset = COMMON_POWER_CONFIGS.find(p => p.name === presetName);
    if (preset && preset.name !== 'Custom') {
      setFormData(prev => ({
        ...prev,
        powerConfigPreset: presetName,
        powerCapacityKva: preset.kva.toString(),
        powerFactor: preset.powerFactor.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        powerConfigPreset: presetName,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Call your Supabase function to create rack
      const response = await supabase.rpc('create_rack_with_power', {
        rack_name_param: formData.rackName,
        dc_site_param: formData.dcSite,
        dc_building_param: formData.dcBuilding,
        dc_floor_param: formData.dcFloor,
        dc_room_param: formData.dcRoom,
        power_capacity_kva_param: parseFloat(formData.powerCapacityKva),
        power_factor_param: parseFloat(formData.powerFactor),
        description_param: formData.description || null
      });
      
      if (response.error) throw response.error;
      
      alert(`Rack created successfully: ${response.data}`);
      // Reset form or redirect
    } catch (error) {
      console.error('Error creating rack:', error);
      alert('Failed to create rack');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Rack with Power Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Rack Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rackName">Rack Name *</Label>
              <Input
                id="rackName"
                value={formData.rackName}
                onChange={(e) => setFormData(prev => ({ ...prev, rackName: e.target.value }))}
                placeholder="RACK-A-01"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="dcSite">Data Center Site *</Label>
              <Select value={formData.dcSite} onValueChange={(value) => setFormData(prev => ({ ...prev, dcSite: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select DC Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DC-East">DC-East</SelectItem>
                  <SelectItem value="DC-West">DC-West</SelectItem>
                  <SelectItem value="DC-North">DC-North</SelectItem>
                  <SelectItem value="DC-South">DC-South</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dcBuilding">Building</Label>
              <Select value={formData.dcBuilding} onValueChange={(value) => setFormData(prev => ({ ...prev, dcBuilding: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Building-A">Building-A</SelectItem>
                  <SelectItem value="Building-B">Building-B</SelectItem>
                  <SelectItem value="Building-C">Building-C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dcFloor">Floor</Label>
              <Select value={formData.dcFloor} onValueChange={(value) => setFormData(prev => ({ ...prev, dcFloor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Floor 1</SelectItem>
                  <SelectItem value="2">Floor 2</SelectItem>
                  <SelectItem value="3">Floor 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="dcRoom">Room</Label>
              <Select value={formData.dcRoom} onValueChange={(value) => setFormData(prev => ({ ...prev, dcRoom: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="101">Room 101</SelectItem>
                  <SelectItem value="102">Room 102</SelectItem>
                  <SelectItem value="MDF">MDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Power Specifications - The Key Enhancement */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-lg mb-4 text-blue-800">Power Specifications</h3>
            
            {/* Power Configuration Presets */}
            <div className="mb-4">
              <Label htmlFor="powerPreset">Power Configuration Preset</Label>
              <Select value={formData.powerConfigPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select common power configuration" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_POWER_CONFIGS.map(config => (
                    <SelectItem key={config.name} value={config.name}>
                      {config.name} - {config.kva}KVA ({Math.round(config.kva * config.powerFactor * 1000)}W)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.powerConfigPreset && formData.powerConfigPreset !== 'Custom' && (
                <p className="text-sm text-gray-600 mt-1">
                  {COMMON_POWER_CONFIGS.find(p => p.name === formData.powerConfigPreset)?.description}
                </p>
              )}
            </div>

            {/* Manual Power Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="powerCapacityKva">Power Capacity (KVA) *</Label>
                <Input
                  id="powerCapacityKva"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.powerCapacityKva}
                  onChange={(e) => setFormData(prev => ({ ...prev, powerCapacityKva: e.target.value }))}
                  placeholder="8.3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Electrical capacity in KVA</p>
              </div>
              
              <div>
                <Label htmlFor="powerFactor">Power Factor</Label>
                <Input
                  id="powerFactor"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.0"
                  value={formData.powerFactor}
                  onChange={(e) => setFormData(prev => ({ ...prev, powerFactor: e.target.value }))}
                  placeholder="0.8"
                />
                <p className="text-xs text-gray-500 mt-1">Typical: 0.8 for IT equipment</p>
              </div>
              
              <div>
                <Label>Calculated Watts</Label>
                <div className="h-10 flex items-center px-3 bg-gray-100 border rounded-md">
                  <span className="font-medium text-gray-700">{calculatedWatts.toLocaleString()}W</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">KVA × Power Factor × 1000</p>
              </div>
            </div>

            {/* Power Calculation Help */}
            <div className="mt-4 p-3 bg-blue-100 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Power Calculation:</strong> The actual usable power is calculated as KVA × Power Factor. 
                Most IT equipment has a power factor of 0.8, meaning an 8.3 KVA circuit provides about 6,640 watts of usable power.
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="High-density storage rack"
              maxLength={40}
            />
          </div>

          <Button type="submit" className="w-full">
            Create Rack
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
