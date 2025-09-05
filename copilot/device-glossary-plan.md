# Device Glossary Feature Plan

## Overview
Create a comprehensive device glossary system that provides detailed specifications for all hardware devices in the data center inventory. This will serve as a centralized knowledge base for device specifications, compatibility, and technical details.

## Core Features

-- Storage Specifications (Example: Server with 12 storage slots)
INSERT INTO device_storage_specs (device_id, storage_slot_number, storage_model, storage_type, capacity_gb, interface_type, hot_plug_support, drive_form_factor, performance_tier, warranty_years, quantity)
VALUES 
    -- Boot drives (2x Samsung Enterprise SSDs)
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 1, 'Samsung PM1633a', 'SATA_SSD', 480, 'SATA', true, '2.5"', 'Enterprise', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 2, 'Samsung PM1633a', 'SATA_SSD', 480, 'SATA', true, '2.5"', 'Enterprise', 5, 1),
    
    -- High-performance NVMe drives (4x Intel, 4x Samsung)
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 3, 'Intel DC P4610', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Datacenter', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 4, 'Intel DC P4610', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Datacenter', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 5, 'Samsung 980 PRO', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Enterprise', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 6, 'Samsung 980 PRO', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Enterprise', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 7, 'Intel DC P4610', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Datacenter', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 8, 'Intel DC P4610', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Datacenter', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 9, 'Samsung 980 PRO', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Enterprise', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 10, 'Samsung 980 PRO', 'NVME_SSD', 960, 'NVMe', true, 'M.2', 'Enterprise', 5, 1),
    
    -- Large capacity storage (WD Enterprise HDDs)
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 11, 'WD Gold WD4003FRYZ', 'SATA_HDD', 4000, 'SATA', true, '3.5"', 'Enterprise', 5, 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 12, 'WD Gold WD4003FRYZ', 'SATA_HDD', 4000, 'SATA', true, '3.5"', 'Enterprise', 5, 1);. Device Glossary Pages
- **Server Specifications**: Detailed CPU, memory, storage, and connectivity specs
- **Storage Device Details**: Drive types, capacities, interfaces, and performance metrics
- **Network Equipment**: Switch/router specifications, port counts, throughput capabilities
- **Power Equipment**: UPS specifications, power ratings, efficiency metrics

### 2. Enhanced Database Schema

#### New Tables

##### `device_glossary`
```sql
CREATE TABLE device_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_model VARCHAR(100) NOT NULL UNIQUE,
    device_type VARCHAR(50) NOT NULL, -- 'Server', 'Storage', 'Network', 'Power'
    manufacturer VARCHAR(100) NOT NULL,
    year INTEGER, -- Manufacturing/release year
    unit_height VARCHAR(10), -- '1U', '2U', '4U', 'Blade', 'Tower', etc.
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Discontinued', 'EOL'
    description TEXT,
    datasheet_url VARCHAR(500),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_cpu_specs`
```sql
CREATE TABLE device_cpu_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    cpu_model VARCHAR(200), -- 'Intel Xeon Platinum 8358×2, 7th Gen'
    cpu_generation VARCHAR(50), -- '7th Gen', '8th Gen', etc.
    physical_cores INTEGER, -- 32
    logical_cores INTEGER, -- 64 (with hyperthreading)
    cpu_quantity INTEGER, -- 2 (dual socket)
    base_frequency_ghz DECIMAL(4,2), -- 2.6
    boost_frequency_ghz DECIMAL(4,2), -- 3.2
    cpu_architecture VARCHAR(20), -- 'x86_64', 'ARM64'
    tdp_watts INTEGER, -- Thermal Design Power
    l1_cache_kb INTEGER,
    l2_cache_mb INTEGER,
    l3_cache_mb INTEGER,
    instruction_sets TEXT[], -- ['AVX', 'AVX2', 'AVX-512']
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_memory_specs`
```sql
CREATE TABLE device_memory_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    total_capacity_gb INTEGER, -- 1024
    memory_type VARCHAR(20), -- 'DDR4', 'DDR5', 'LRDIMM', 'RDIMM'
    memory_frequency_mhz INTEGER, -- 3200
    module_count INTEGER, -- 32
    module_capacity_gb INTEGER, -- 32 (per module)
    ecc_support BOOLEAN DEFAULT false,
    maximum_capacity_gb INTEGER, -- Maximum supported
    memory_channels INTEGER, -- 8
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_storage_specs`
```sql
CREATE TABLE device_storage_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    storage_slot_number INTEGER, -- 1, 2, 3, etc.
    storage_model VARCHAR(100), -- 'Samsung 980 PRO', 'Intel DC P4610', 'WD Gold WD4003FRYZ'
    storage_type VARCHAR(20), -- 'SATA_SSD', 'NVME_SSD', 'SATA_HDD', 'SAS_SSD'
    capacity_gb INTEGER, -- 480, 960, etc.
    interface_type VARCHAR(20), -- 'SATA', 'SAS', 'NVMe', 'M.2'
    hot_plug_support BOOLEAN DEFAULT false,
    drive_form_factor VARCHAR(20), -- '2.5"', '3.5"', 'M.2'
    performance_tier VARCHAR(20), -- 'Enterprise', 'Datacenter', 'Consumer'
    warranty_years INTEGER, -- 3, 5, etc.
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_network_specs`
```sql
CREATE TABLE device_network_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    nic_slot_number INTEGER, -- 1, 2, 3, etc. (PCIe slot or onboard)
    nic_type VARCHAR(20), -- 'Onboard', 'PCIe', 'Mezzanine'
    nic_manufacturer VARCHAR(50), -- 'Intel', 'Broadcom', 'Mellanox', 'Cisco'
    nic_model VARCHAR(100), -- 'Intel X710-DA4', 'Broadcom BCM57414'
    port_type VARCHAR(50), -- 'SFP28', 'RJ45', 'QSFP+', 'SFP+'
    port_speed_gbps INTEGER, -- 25, 10, 1
    port_quantity INTEGER, -- Number of ports on this NIC
    connector_type VARCHAR(20), -- 'SFP28', 'RJ45', 'LC'
    is_management_port BOOLEAN DEFAULT false,
    supported_modules TEXT[], -- ['25G_SFP28', '10G_SFP+']
    driver_support TEXT[], -- ['Linux', 'Windows', 'VMware']
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_power_specs`
```sql
CREATE TABLE device_power_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    psu_slot_number INTEGER, -- 1, 2, etc. (for multiple PSU slots)
    max_power_watts INTEGER, -- 1300 (maximum power per PSU)
    power_cable_type VARCHAR(20), -- 'C13', 'C19', 'C20' (for rack planning)
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_management_specs`
```sql
CREATE TABLE device_management_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    management_type VARCHAR(50), -- 'iDRAC', 'iLO', 'IPMI', 'BMC', 'None'
    remote_console_support BOOLEAN DEFAULT false, -- Can you access console remotely?
    power_control_support BOOLEAN DEFAULT false, -- Can you power on/off remotely?
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### `device_compatibility`
```sql
CREATE TABLE device_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    compatible_with UUID REFERENCES device_glossary(id) ON DELETE CASCADE,
    compatibility_type VARCHAR(50), -- 'memory', 'storage', 'network_card', 'psu'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. User Interface Components

#### Device Glossary List Page
```typescript
// Components to create:
- DeviceGlossaryList.tsx
- DeviceGlossaryCard.tsx
- DeviceFilterBar.tsx
- DeviceSearchBar.tsx
```

#### Device Detail Page
```typescript
// Components to create:
- DeviceDetailView.tsx
- SpecificationTabs.tsx
- CompatibilityMatrix.tsx
- TechnicalDrawings.tsx
- ServerComparisonModal.tsx
```

#### Server Model Comparison Interface
```typescript
// Components to create:
- ServerComparisonPage.tsx
- ComparisonTable.tsx
- ModelSelector.tsx
- ComparisonFilters.tsx
- ComparisonExport.tsx
- DifferenceHighlighter.tsx
```

#### Admin Management
```typescript
// Components to create:
- DeviceGlossaryAdmin.tsx
- AddDeviceDialog.tsx
- EditSpecificationsDialog.tsx
- BulkImportDialog.tsx
```

### Server Comparison Frontend Components

#### 1. Server Comparison Page
```typescript
// src/components/comparison/ServerComparisonPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from './ModelSelector';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonFilters } from './ComparisonFilters';
import { ComparisonExport } from './ComparisonExport';
import { Compare, X, Download, Filter } from 'lucide-react';

interface ServerModel {
  id: string;
  device_model: string;
  manufacturer: string;
  year: number;
  unit_height: string;
}

interface ComparisonData {
  models: ServerModel[];
  specifications: {
    cpu: any[];
    memory: any[];
    storage: any[];
    network: any[];
    power: any[];
    management: any[];
  };
  differences: string[];
  summary: {
    pros: string[];
    cons: string[];
    recommendations: string[];
  };
}

export const ServerComparisonPage: React.FC = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(['cpu', 'memory', 'storage', 'network', 'power']);

  const addModel = (modelId: string) => {
    if (selectedModels.length < 5 && !selectedModels.includes(modelId)) {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter(id => id !== modelId));
    // Clear comparison if less than 2 models
    if (selectedModels.length <= 2) {
      setComparisonData(null);
    }
  };

  const loadComparison = async () => {
    if (selectedModels.length < 2) return;
    
    setLoading(true);
    try {
      const modelsQuery = selectedModels.join(',');
      const filtersQuery = activeFilters.join(',');
      
      const response = await fetch(
        `/api/device-glossary/compare?models=${modelsQuery}&include=${filtersQuery}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      }
    } catch (error) {
      console.error('Failed to load comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [selectedModels, activeFilters]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Server Model Comparison</h1>
          <p className="text-gray-600 mt-2">
            Compare up to 5 server models side-by-side with detailed specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          {comparisonData && (
            <ComparisonExport 
              models={selectedModels}
              comparisonData={comparisonData}
            />
          )}
        </div>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Compare className="w-5 h-5 mr-2" />
            Select Server Models ({selectedModels.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Models */}
            {selectedModels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedModels.map((modelId) => (
                  <Badge
                    key={modelId}
                    variant="secondary"
                    className="px-3 py-1 flex items-center gap-2"
                  >
                    {modelId}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeModel(modelId)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Model Selector */}
            <ModelSelector 
              selectedModels={selectedModels}
              onModelSelect={addModel}
              maxSelection={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Comparison Filters */}
      {showFilters && (
        <ComparisonFilters
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      )}

      {/* Comparison Results */}
      {loading && (
        <Card>
          <CardContent className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading comparison...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonData && !loading && (
        <ComparisonTable 
          comparisonData={comparisonData}
          activeFilters={activeFilters}
        />
      )}

      {selectedModels.length < 2 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Compare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select Models to Compare
            </h3>
            <p className="text-gray-600">
              Choose at least 2 server models to see a detailed comparison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

#### 2. Comparison Table Component
```typescript
// src/components/comparison/ComparisonTable.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DifferenceHighlighter } from './DifferenceHighlighter';
import { Cpu, Memory, HardDrive, Network, Zap, Settings } from 'lucide-react';

interface ComparisonTableProps {
  comparisonData: ComparisonData;
  activeFilters: string[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  comparisonData,
  activeFilters
}) => {
  const { models, specifications } = comparisonData;

  const specSections = [
    {
      key: 'cpu',
      title: 'CPU Specifications',
      icon: <Cpu className="w-5 h-5" />,
      fields: [
        { key: 'cpu_model', label: 'CPU Model' },
        { key: 'physical_cores', label: 'Physical Cores', type: 'number' },
        { key: 'logical_cores', label: 'Logical Cores', type: 'number' },
        { key: 'cpu_quantity', label: 'CPU Quantity', type: 'number' },
        { key: 'base_frequency_ghz', label: 'Base Frequency (GHz)', type: 'number' },
        { key: 'boost_frequency_ghz', label: 'Boost Frequency (GHz)', type: 'number' },
        { key: 'tdp_watts', label: 'TDP (Watts)', type: 'number' }
      ]
    },
    {
      key: 'memory',
      title: 'Memory Specifications',
      icon: <Memory className="w-5 h-5" />,
      fields: [
        { key: 'total_capacity_gb', label: 'Total Capacity (GB)', type: 'number' },
        { key: 'memory_type', label: 'Memory Type' },
        { key: 'memory_frequency_mhz', label: 'Frequency (MHz)', type: 'number' },
        { key: 'module_count', label: 'Module Count', type: 'number' },
        { key: 'module_capacity_gb', label: 'Module Capacity (GB)', type: 'number' },
        { key: 'maximum_capacity_gb', label: 'Maximum Capacity (GB)', type: 'number' },
        { key: 'ecc_support', label: 'ECC Support', type: 'boolean' }
      ]
    },
    {
      key: 'storage',
      title: 'Storage Configuration',
      icon: <HardDrive className="w-5 h-5" />,
      isArray: true,
      fields: [
        { key: 'storage_slot_number', label: 'Slot #', type: 'number' },
        { key: 'storage_model', label: 'Storage Model' },
        { key: 'storage_type', label: 'Type' },
        { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number' },
        { key: 'interface_type', label: 'Interface' },
        { key: 'drive_form_factor', label: 'Form Factor' },
        { key: 'performance_tier', label: 'Performance Tier' }
      ]
    },
    {
      key: 'network',
      title: 'Network Interfaces',
      icon: <Network className="w-5 h-5" />,
      isArray: true,
      fields: [
        { key: 'nic_slot_number', label: 'Slot #', type: 'number' },
        { key: 'nic_manufacturer', label: 'NIC Manufacturer' },
        { key: 'nic_model', label: 'NIC Model' },
        { key: 'port_type', label: 'Port Type' },
        { key: 'port_speed_gbps', label: 'Speed (Gbps)', type: 'number' },
        { key: 'port_quantity', label: 'Port Count', type: 'number' },
        { key: 'is_management_port', label: 'Management Port', type: 'boolean' }
      ]
    },
    {
      key: 'power',
      title: 'Power Specifications',
      icon: <Zap className="w-5 h-5" />,
      isArray: true,
      fields: [
        { key: 'psu_slot_number', label: 'PSU Slot #', type: 'number' },
        { key: 'max_power_watts', label: 'Max Power (W)', type: 'number' },
        { key: 'power_cable_type', label: 'Cable Type' }
      ]
    }
  ];

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return 'N/A';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'number') return value.toLocaleString();
    return value;
  };

  const getValueDifference = (field: string, modelIndex: number, allValues: any[]) => {
    // Helper to determine if this value is different from others
    const currentValue = allValues[modelIndex];
    const otherValues = allValues.filter((_, i) => i !== modelIndex);
    return otherValues.some(val => val !== currentValue);
  };

  return (
    <div className="space-y-6">
      {/* Models Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Models Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Specification</th>
                  {models.map((model) => (
                    <th key={model.id} className="text-left p-3 font-medium min-w-[200px]">
                      <div className="space-y-1">
                        <div className="font-bold">{model.device_model}</div>
                        <div className="text-sm text-gray-600">{model.manufacturer}</div>
                        <Badge variant="outline" className="text-xs">
                          {model.year} • {model.unit_height}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Specifications */}
      {specSections
        .filter(section => activeFilters.includes(section.key))
        .map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center">
                {section.icon}
                <span className="ml-2">{section.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {section.isArray ? (
                  // Array specifications (storage, network, power)
                  <div className="space-y-4">
                    {models.map((model, modelIndex) => {
                      const modelSpecs = specifications[section.key][modelIndex] || [];
                      return (
                        <div key={model.id} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3">{model.device_model}</h4>
                          {modelSpecs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {modelSpecs.map((spec: any, specIndex: number) => (
                                <div key={specIndex} className="border rounded p-3 space-y-1">
                                  {section.fields.map((field) => (
                                    <div key={field.key} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{field.label}:</span>
                                      <span className="font-medium">
                                        {formatValue(spec[field.key], field.type)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No {section.title.toLowerCase()} data</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Single specifications (cpu, memory)
                  <table className="w-full border-collapse">
                    <tbody>
                      {section.fields.map((field) => {
                        const allValues = models.map((_, i) => 
                          specifications[section.key][i]?.[field.key]
                        );
                        
                        return (
                          <tr key={field.key} className="border-b">
                            <td className="p-3 font-medium text-gray-700 min-w-[200px]">
                              {field.label}
                            </td>
                            {models.map((model, modelIndex) => {
                              const value = specifications[section.key][modelIndex]?.[field.key];
                              const isDifferent = getValueDifference(field.key, modelIndex, allValues);
                              
                              return (
                                <td key={model.id} className="p-3 min-w-[200px]">
                                  <DifferenceHighlighter
                                    value={formatValue(value, field.type)}
                                    isDifferent={isDifferent}
                                    type={field.type}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

      {/* Comparison Summary */}
      {comparisonData.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Key Strengths</h4>
                <ul className="space-y-1">
                  {comparisonData.summary.pros.map((pro, index) => (
                    <li key={index} className="text-sm text-green-600">• {pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-700 mb-2">Considerations</h4>
                <ul className="space-y-1">
                  {comparisonData.summary.cons.map((con, index) => (
                    <li key={index} className="text-sm text-red-600">• {con}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {comparisonData.summary.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600">• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

#### 3. Model Selector Component
```typescript
// src/components/comparison/ModelSelector.tsx
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Server } from 'lucide-react';

interface ModelSelectorProps {
  selectedModels: string[];
  onModelSelect: (modelId: string) => void;
  maxSelection: number;
}

interface ServerModel {
  id: string;
  device_model: string;
  manufacturer: string;
  year: number;
  unit_height: string;
  device_type: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModels,
  onModelSelect,
  maxSelection
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableModels, setAvailableModels] = useState<ServerModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<ServerModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  useEffect(() => {
    filterModels();
  }, [searchQuery, availableModels, selectedModels]);

  const loadAvailableModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/device-glossary?device_type=Server');
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterModels = () => {
    let filtered = availableModels.filter(
      model => !selectedModels.includes(model.device_model)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model =>
        model.device_model.toLowerCase().includes(query) ||
        model.manufacturer.toLowerCase().includes(query)
      );
    }

    setFilteredModels(filtered.slice(0, 10)); // Limit to 10 results
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search server models (e.g., PF72P4M6.32, DL380, PowerEdge)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="border rounded-lg p-3 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">{model.device_model}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {model.manufacturer} • {model.year} • {model.unit_height}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onModelSelect(model.device_model)}
                    disabled={selectedModels.length >= maxSelection}
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add to Comparison
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredModels.length === 0 && !loading && searchQuery && (
        <p className="text-center text-gray-500 py-4">
          No models found matching "{searchQuery}"
        </p>
      )}
    </div>
  );
};
```

#### 4. Difference Highlighter Component
```typescript
// src/components/comparison/DifferenceHighlighter.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface DifferenceHighlighterProps {
  value: string | number;
  isDifferent: boolean;
  type?: string;
}

export const DifferenceHighlighter: React.FC<DifferenceHighlighterProps> = ({
  value,
  isDifferent,
  type
}) => {
  if (!isDifferent) {
    return <span className="text-gray-700">{value}</span>;
  }

  // Highlight differences with colored background
  const getHighlightColor = (val: string | number, type?: string) => {
    if (type === 'number') {
      const numVal = typeof val === 'number' ? val : parseFloat(val.toString());
      if (numVal > 0) {
        return 'bg-blue-100 text-blue-800';
      }
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <Badge variant="secondary" className={`${getHighlightColor(value, type)} font-medium`}>
      {value}
    </Badge>
  );
};
```

### 4. API Endpoints

#### REST API Structure
```
# Device Glossary CRUD
GET /api/device-glossary
GET /api/device-glossary/:id
POST /api/device-glossary
PUT /api/device-glossary/:id
DELETE /api/device-glossary/:id

# Complete device specifications (joined view)
GET /api/device-glossary/:id/complete-specs
GET /api/device-glossary/search?cpu_cores=32&memory_gb=1024&year=2023

# Individual specification tables
GET /api/device-glossary/:id/cpu-specs
POST /api/device-glossary/:id/cpu-specs
PUT /api/device-cpu-specs/:id

GET /api/device-glossary/:id/memory-specs
POST /api/device-glossary/:id/memory-specs
PUT /api/device-memory-specs/:id

GET /api/device-glossary/:id/storage-specs
POST /api/device-glossary/:id/storage-specs
PUT /api/device-storage-specs/:id

GET /api/device-glossary/:id/network-specs
POST /api/device-glossary/:id/network-specs
PUT /api/device-network-specs/:id

GET /api/device-glossary/:id/management-specs
POST /api/device-glossary/:id/management-specs
PUT /api/device-management-specs/:id

# Compatibility and comparison
GET /api/device-glossary/:id/compatibility
POST /api/device-compatibility
DELETE /api/device-compatibility/:id

# Server Model Comparison API
GET /api/device-glossary/compare?models=PF72P4M6.32,DL380Gen10Plus,PowerEdgeR750
GET /api/device-glossary/compare/detailed?models=model1,model2,model3&include=cpu,memory,storage,network,power
GET /api/device-glossary/compare/summary?models=model1,model2,model3
GET /api/device-glossary/compare/export?models=model1,model2,model3&format=pdf

# Advanced queries
GET /api/device-glossary/filter?min_memory=512&max_power=1500&unit_height=2U
```

#### Server Comparison API Implementation
```typescript
// src/api/routes/device-comparison.ts
import express from 'express';
import { DeviceComparisonService } from '../services/device-comparison.service';

const router = express.Router();
const comparisonService = new DeviceComparisonService();

// Compare multiple server models
router.get('/compare', async (req, res) => {
  try {
    const { models, include } = req.query;
    const modelList = (models as string).split(',').filter(Boolean);
    const includeSpecs = include ? (include as string).split(',') : ['all'];
    
    if (modelList.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 models required for comparison' 
      });
    }
    
    if (modelList.length > 5) {
      return res.status(400).json({ 
        error: 'Maximum 5 models can be compared at once' 
      });
    }
    
    const comparison = await comparisonService.compareModels(modelList, includeSpecs);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comparison summary (key differences only)
router.get('/compare/summary', async (req, res) => {
  try {
    const { models } = req.query;
    const modelList = (models as string).split(',').filter(Boolean);
    
    const summary = await comparisonService.getComparisonSummary(modelList);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export comparison as PDF/Excel
router.get('/compare/export', async (req, res) => {
  try {
    const { models, format = 'pdf' } = req.query;
    const modelList = (models as string).split(',').filter(Boolean);
    
    const exportData = await comparisonService.exportComparison(
      modelList, 
      format as 'pdf' | 'excel'
    );
    
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="server-comparison.${format}"`);
    res.send(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 5. Integration with Existing System

#### Server Inventory Enhancement
- Add `device_glossary_id` to `servers` table
- Link server records to glossary entries
- Display specification lookup in server details
- Auto-populate fields from glossary when selecting model
- **Server Comparison Integration**: Add "Compare Models" button in server inventory
- **Quick Compare**: Right-click context menu on server entries to add to comparison
- **Comparison History**: Save and recall previous comparisons

#### Search and Filtering
- Global search across device specifications using proper SQL queries
- Filter by manufacturer, year, device type with indexed columns
- Advanced search by technical specifications:
  - CPU: `WHERE cpu_cores >= 16 AND cpu_frequency_ghz >= 2.5`
  - Memory: `WHERE total_capacity_gb >= 512 AND memory_type = 'DDR4'`
  - Storage: `WHERE storage_type = 'NVME_SSD' AND capacity_gb >= 1000`
  - Power: `WHERE psu_wattage <= 1500 AND psu_efficiency = 'Platinum'`
- Compatibility-based filtering with JOIN queries
- Performance-optimized queries with proper indexes on frequently searched columns
- **Comparison-based Filtering**: "Find Similar Models" based on current comparison

#### Server Comparison Backend Service
```typescript
// src/services/device-comparison.service.ts
import { Database } from '../types/database';

export class DeviceComparisonService {
  constructor(private db: Database) {}

  async compareModels(modelList: string[], includeSpecs: string[] = ['all']): Promise<ComparisonData> {
    const models = await this.getModelDetails(modelList);
    const specifications = await this.getSpecifications(models, includeSpecs);
    const differences = this.analyzeDifferences(specifications);
    const summary = await this.generateSummary(models, specifications);

    return {
      models,
      specifications,
      differences,
      summary
    };
  }

  private async getModelDetails(modelList: string[]) {
    const query = `
      SELECT id, device_model, manufacturer, year, unit_height, status, description
      FROM device_glossary
      WHERE device_model = ANY($1)
      ORDER BY array_position($1, device_model)
    `;
    
    return await this.db.query(query, [modelList]);
  }

  private async getSpecifications(models: any[], includeSpecs: string[]) {
    const specifications: any = {};
    
    for (const spec of includeSpecs) {
      if (spec === 'all' || spec === 'cpu') {
        specifications.cpu = await this.getCpuSpecs(models);
      }
      if (spec === 'all' || spec === 'memory') {
        specifications.memory = await this.getMemorySpecs(models);
      }
      if (spec === 'all' || spec === 'storage') {
        specifications.storage = await this.getStorageSpecs(models);
      }
      if (spec === 'all' || spec === 'network') {
        specifications.network = await this.getNetworkSpecs(models);
      }
      if (spec === 'all' || spec === 'power') {
        specifications.power = await this.getPowerSpecs(models);
      }
    }
    
    return specifications;
  }

  private async getCpuSpecs(models: any[]) {
    const modelIds = models.map(m => m.id);
    const query = `
      SELECT 
        device_id,
        cpu_model,
        cpu_generation,
        physical_cores,
        logical_cores,
        cpu_quantity,
        base_frequency_ghz,
        boost_frequency_ghz,
        cpu_architecture,
        tdp_watts,
        l3_cache_mb
      FROM device_cpu_specs
      WHERE device_id = ANY($1)
      ORDER BY array_position($1, device_id)
    `;
    
    const specs = await this.db.query(query, [modelIds]);
    
    // Group by device_id to maintain model order
    return models.map(model => 
      specs.find(spec => spec.device_id === model.id) || null
    );
  }

  private async getMemorySpecs(models: any[]) {
    const modelIds = models.map(m => m.id);
    const query = `
      SELECT 
        device_id,
        total_capacity_gb,
        memory_type,
        memory_frequency_mhz,
        module_count,
        module_capacity_gb,
        ecc_support,
        maximum_capacity_gb,
        memory_channels
      FROM device_memory_specs
      WHERE device_id = ANY($1)
      ORDER BY array_position($1, device_id)
    `;
    
    const specs = await this.db.query(query, [modelIds]);
    
    return models.map(model => 
      specs.find(spec => spec.device_id === model.id) || null
    );
  }

  private async getStorageSpecs(models: any[]) {
    const modelIds = models.map(m => m.id);
    const query = `
      SELECT 
        device_id,
        storage_slot_number,
        storage_model,
        storage_type,
        capacity_gb,
        interface_type,
        hot_plug_support,
        drive_form_factor,
        performance_tier,
        warranty_years,
        quantity
      FROM device_storage_specs
      WHERE device_id = ANY($1)
      ORDER BY device_id, storage_slot_number
    `;
    
    const specs = await this.db.query(query, [modelIds]);
    
    // Group by device_id
    return models.map(model => 
      specs.filter(spec => spec.device_id === model.id) || []
    );
  }

  private async getNetworkSpecs(models: any[]) {
    const modelIds = models.map(m => m.id);
    const query = `
      SELECT 
        device_id,
        nic_slot_number,
        nic_type,
        nic_manufacturer,
        nic_model,
        port_type,
        port_speed_gbps,
        port_quantity,
        connector_type,
        is_management_port
      FROM device_network_specs
      WHERE device_id = ANY($1)
      ORDER BY device_id, nic_slot_number
    `;
    
    const specs = await this.db.query(query, [modelIds]);
    
    return models.map(model => 
      specs.filter(spec => spec.device_id === model.id) || []
    );
  }

  private async getPowerSpecs(models: any[]) {
    const modelIds = models.map(m => m.id);
    const query = `
      SELECT 
        device_id,
        psu_slot_number,
        max_power_watts,
        power_cable_type
      FROM device_power_specs
      WHERE device_id = ANY($1)
      ORDER BY device_id, psu_slot_number
    `;
    
    const specs = await this.db.query(query, [modelIds]);
    
    return models.map(model => 
      specs.filter(spec => spec.device_id === model.id) || []
    );
  }

  private analyzeDifferences(specifications: any): string[] {
    const differences: string[] = [];
    
    // Analyze CPU differences
    if (specifications.cpu) {
      const cpuSpecs = specifications.cpu.filter(Boolean);
      if (cpuSpecs.length > 1) {
        const cores = cpuSpecs.map(s => s.physical_cores);
        const frequencies = cpuSpecs.map(s => s.base_frequency_ghz);
        
        if (new Set(cores).size > 1) {
          differences.push(`CPU cores vary: ${Math.min(...cores)} to ${Math.max(...cores)} cores`);
        }
        if (new Set(frequencies).size > 1) {
          differences.push(`CPU frequencies vary: ${Math.min(...frequencies)} to ${Math.max(...frequencies)} GHz`);
        }
      }
    }
    
    // Analyze Memory differences
    if (specifications.memory) {
      const memSpecs = specifications.memory.filter(Boolean);
      if (memSpecs.length > 1) {
        const capacities = memSpecs.map(s => s.total_capacity_gb);
        const types = memSpecs.map(s => s.memory_type);
        
        if (new Set(capacities).size > 1) {
          differences.push(`Memory capacity varies: ${Math.min(...capacities)} to ${Math.max(...capacities)} GB`);
        }
        if (new Set(types).size > 1) {
          differences.push(`Memory types: ${[...new Set(types)].join(', ')}`);
        }
      }
    }
    
    return differences;
  }

  private async generateSummary(models: any[], specifications: any) {
    const summary = {
      pros: [],
      cons: [],
      recommendations: []
    };
    
    // Generate recommendations based on specifications
    if (specifications.cpu) {
      const cpuSpecs = specifications.cpu.filter(Boolean);
      const maxCores = Math.max(...cpuSpecs.map(s => s.physical_cores || 0));
      const highCoreModel = models[cpuSpecs.findIndex(s => s.physical_cores === maxCores)];
      
      if (highCoreModel) {
        summary.recommendations.push(
          `${highCoreModel.device_model} offers the highest CPU performance with ${maxCores} cores`
        );
      }
    }
    
    if (specifications.memory) {
      const memSpecs = specifications.memory.filter(Boolean);
      const maxMemory = Math.max(...memSpecs.map(s => s.total_capacity_gb || 0));
      const highMemModel = models[memSpecs.findIndex(s => s.total_capacity_gb === maxMemory)];
      
      if (highMemModel) {
        summary.recommendations.push(
          `${highMemModel.device_model} provides the most memory capacity with ${maxMemory} GB`
        );
      }
    }
    
    return summary;
  }

  async getComparisonSummary(modelList: string[]) {
    // Quick summary focusing on key differences only
    const models = await this.getModelDetails(modelList);
    const basicSpecs = await this.getSpecifications(models, ['cpu', 'memory']);
    
    return {
      models: models.map(m => ({
        model: m.device_model,
        manufacturer: m.manufacturer,
        year: m.year
      })),
      keyDifferences: this.analyzeDifferences(basicSpecs).slice(0, 5) // Top 5 differences
    };
  }

  async exportComparison(modelList: string[], format: 'pdf' | 'excel') {
    const comparisonData = await this.compareModels(modelList);
    
    if (format === 'pdf') {
      return await this.generatePdfReport(comparisonData);
    } else {
      return await this.generateExcelReport(comparisonData);
    }
  }

  private async generatePdfReport(data: ComparisonData): Promise<Buffer> {
    // PDF generation logic using libraries like puppeteer or pdfkit
    // This would create a formatted PDF with comparison tables
    throw new Error('PDF generation not implemented yet');
  }

  private async generateExcelReport(data: ComparisonData): Promise<Buffer> {
    // Excel generation logic using libraries like exceljs
    // This would create a spreadsheet with multiple sheets for each spec type
    throw new Error('Excel generation not implemented yet');
  }
}
```

### 6. Implementation Phases

#### Phase 1: Database Schema & Basic CRUD
- [ ] Create database tables and relationships
- [ ] Implement basic API endpoints
- [ ] Create admin interface for adding devices
- [ ] Add device glossary navigation menu

#### Phase 2: Server Specifications Interface
- [ ] Build device detail view components
- [ ] Implement specification tabs interface
- [ ] Create specification editing interface
- [ ] Add image and datasheet upload

#### Phase 3: Server Model Comparison Feature
- [ ] Implement comparison API endpoints and service
- [ ] Build ServerComparisonPage component
- [ ] Create ComparisonTable with difference highlighting
- [ ] Add ModelSelector with search functionality
- [ ] Implement comparison filters and export features
- [ ] Add "Compare Models" integration to server inventory
- [ ] Create comparison history and saved comparisons

#### Phase 4: Integration & Search
- [ ] Link server inventory to device glossary
- [ ] Implement search and filtering
- [ ] Add specification lookup in server forms
- [ ] Create compatibility matrix views
- [ ] Integrate comparison features throughout the system

#### Phase 5: Advanced Features
- [ ] Bulk import from CSV/Excel
- [ ] Advanced comparison analytics and recommendations
- [ ] Hardware lifecycle tracking
- [ ] Automated specification extraction from datasheets
- [ ] PDF/Excel export for comparisons
- [ ] Comparison sharing and collaboration features

### 7. Sample Data Structure

#### Example Server Entry (PF72P4M6.32)
```sql
-- Device Glossary Entry
INSERT INTO device_glossary (device_model, manufacturer, device_type, year, unit_height, status, description) 
VALUES (
    'PF72P4M6.32',
    'Intel',
    'Server',
    2023,
    '2U',
    'Active',
    'High-performance 2U rackmount server with dual Xeon processors'
);

-- CPU Specifications
INSERT INTO device_cpu_specs (device_id, cpu_model, cpu_generation, physical_cores, logical_cores, cpu_quantity, base_frequency_ghz, cpu_architecture, tdp_watts)
VALUES (
    (SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'),
    'Intel Xeon Platinum 8358×2',
    '7th Gen',
    32,
    64,
    2,
    2.6,
    'x86_64',
    250
);

-- Memory Specifications
INSERT INTO device_memory_specs (device_id, total_capacity_gb, memory_type, memory_frequency_mhz, module_count, module_capacity_gb, ecc_support, maximum_capacity_gb)
VALUES (
    (SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'),
    1024,
    'DDR4',
    3200,
    32,
    32,
    true,
    2048
);

-- Storage Specifications
INSERT INTO device_storage_specs (device_id, storage_slot_number, storage_type, capacity_gb, interface_type, hot_plug_support, drive_form_factor, quantity)
VALUES 
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 1, 'SATA_SSD', 480, 'SATA', true, '2.5"', 1),
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 2, 'NVME_SSD', 960, 'NVMe', true, 'M.2', 8);

-- Network Specifications (Multiple NICs with different port configurations)
INSERT INTO device_network_specs (device_id, nic_slot_number, nic_type, nic_manufacturer, nic_model, port_type, port_speed_gbps, port_quantity, connector_type, is_management_port)
VALUES 
    -- Onboard Intel NIC with 4 data ports
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 0, 'Onboard', 'Intel', 'Intel I350-AM4', 'RJ45', 1, 4, 'RJ45', false),
    
    -- Dedicated management port (single port)
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 0, 'Onboard', 'Intel', 'Intel I210-AT', 'RJ45', 1, 1, 'RJ45', true),
    
    -- High-speed Mellanox NIC with 2 data ports
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 1, 'PCIe', 'Mellanox', 'ConnectX-6 Dx', 'SFP28', 25, 2, 'SFP28', false),
    
    -- Broadcom NIC with 2 data ports
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 2, 'PCIe', 'Broadcom', 'BCM57414', 'SFP+', 10, 2, 'SFP+', false),
    
    -- Intel high-speed NIC with 4 data ports
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 3, 'PCIe', 'Intel', 'X710-DA4', 'SFP+', 10, 4, 'SFP+', false);

-- Power Specifications (Multiple PSUs)
INSERT INTO device_power_specs (device_id, psu_slot_number, psu_model, psu_wattage, psu_efficiency, power_cable_type, is_redundant)
VALUES 
    -- Primary PSU
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 1, '220VAC/240VDC AC-DC Primary', 1300, 'Platinum', 'C13-C14', false),
    
    -- Redundant PSU (same model for redundancy)
    ((SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'), 2, '220VAC/240VDC AC-DC Redundant', 1300, 'Platinum', 'C13-C14', true);

-- Management Specifications
INSERT INTO device_management_specs (device_id, oob_management_type, dedicated_management_port, kvm_over_ip, virtual_media_support, firmware_type)
VALUES (
    (SELECT id FROM device_glossary WHERE device_model = 'PF72P4M6.32'),
    'IPMI',
    true,
    true,
    true,
    'UEFI'
);
```

## Benefits of Column-Based Approach

### Database Performance
- **Indexed Queries**: Individual columns can be properly indexed for fast filtering
- **Query Optimization**: SQL optimizer can efficiently process WHERE clauses on specific columns
- **JOIN Performance**: Proper foreign key relationships enable efficient JOINs
- **Data Types**: Appropriate data types (INTEGER, DECIMAL, BOOLEAN) for better storage and comparison

### Advanced Filtering Examples
```sql
-- Find servers with specific CPU and memory requirements
SELECT dg.device_model, dg.manufacturer, dg.year,
       cpu.physical_cores, cpu.base_frequency_ghz,
       mem.total_capacity_gb, mem.memory_type
FROM device_glossary dg
JOIN device_cpu_specs cpu ON dg.id = cpu.device_id
JOIN device_memory_specs mem ON dg.id = mem.device_id
WHERE cpu.physical_cores >= 32 
  AND cpu.base_frequency_ghz >= 2.5
  AND mem.total_capacity_gb >= 1024
  AND dg.year >= 2020;

-- Find servers by power consumption range
SELECT dg.device_model, pow.typical_power_consumption_watts, pow.psu_efficiency
FROM device_glossary dg
JOIN device_power_specs pow ON dg.id = pow.device_id
WHERE pow.typical_power_consumption_watts BETWEEN 800 AND 1200
  AND pow.psu_efficiency IN ('Gold', 'Platinum', 'Titanium');

-- Find servers with specific network capabilities
SELECT dg.device_model, net.port_type, net.port_speed_gbps, net.port_quantity
FROM device_glossary dg
JOIN device_network_specs net ON dg.id = net.device_id
WHERE net.port_speed_gbps >= 25
  AND net.port_type = 'SFP28';
```

### Data Integrity & Validation
- **Type Safety**: Enforced data types prevent invalid data entry
- **Constraints**: Check constraints can validate ranges (e.g., CPU cores > 0)
- **Foreign Keys**: Referential integrity between device and specifications
- **Null Handling**: Explicit handling of optional specifications

### 8. Business Benefits

#### For Procurement Teams
- **Side-by-side Comparison**: Compare up to 5 server models simultaneously with detailed specifications
- **Specification Analysis**: Identify key differences in CPU, memory, storage, and network capabilities
- **Cost-Performance Evaluation**: Make informed decisions based on detailed technical comparisons
- **Vendor Standardization**: Compare models across different manufacturers (Dell, HP, Lenovo, etc.)
- **Requirements Matching**: Filter and compare models that meet specific technical requirements

#### For Technical Teams
- **Quick Specification Access**: Instant access to detailed hardware specifications
- **Compatibility Verification**: Check component compatibility before deployment
- **Performance Planning**: Compare processing power, memory, and storage across models
- **Network Planning**: Analyze network interface capabilities and port configurations
- **Power Planning**: Compare power consumption and PSU requirements

#### For Operations Teams
- **Troubleshooting Reference**: Detailed specifications for maintenance and support
- **Capacity Planning**: Accurate specifications for infrastructure scaling
- **Documentation Standards**: Centralized hardware documentation for compliance
- **Maintenance Scheduling**: Track device age and lifecycle information

#### Comparison-Specific Benefits
- **Visual Difference Highlighting**: Automatically highlight specification differences between models
- **Export Capabilities**: Generate PDF/Excel reports for stakeholder presentations
- **Comparison History**: Save and recall previous comparisons for reference
- **Recommendation Engine**: AI-powered suggestions based on comparison results
- **Integration Workflow**: Compare models directly from server inventory interface

### 9. Future Enhancements

#### Advanced Analytics
- Hardware utilization analytics
- Lifecycle cost analysis
- Performance benchmarking data
- Failure rate tracking by model/year

#### Integration Opportunities
- Asset management system integration
- Vendor API integration for specifications
- Automated discovery and specification matching
- Integration with monitoring systems

#### AI/ML Features
- Specification extraction from datasheets
- Compatibility prediction algorithms
- Optimal configuration recommendations
- Predictive maintenance based on device age

This comprehensive device glossary will transform the DCIM system from a simple inventory tool into a complete hardware knowledge management platform.
