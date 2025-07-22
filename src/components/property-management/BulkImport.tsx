import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnums } from "@/hooks/useEnums";

// Define valid enum values for validation matching the database schema
type ValidEnumKey = 'brand' | 'model' | 'operating_system' | 'dc_site' | 'dc_building' | 'allocation' | 'environment' | 'status' | 'device_type';
type ValidEnums = Record<ValidEnumKey, readonly string[]>;

const validEnums: ValidEnums = {
  brand: ['Dell', 'HPE', 'Cisco', 'Juniper', 'NetApp', 'Huawei', 'Inspur', 'Kaytus', 'ZTE', 'Meta Brain'],
  model: [
    'PowerEdge R740', 'PowerEdge R750', 'PowerEdge R750xd', 'PowerVault ME4',
    'ProLiant DL380', 'ProLiant DL360', 'Apollo 4510', 'ASA 5525-X',
    'Nexus 93180YC-EX', 'MX204', 'AFF A400', 'Other'
  ],
  operating_system: [
    'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'RHEL 8', 'CentOS 7',
    'Oracle Linux 8', 'Windows Server 2022', 'Windows Server 2019',
    'Storage OS 2.1', 'Cisco ASA 9.16', 'NX-OS 9.3', 'JunOS 21.2',
    'ONTAP 9.10', 'Other'
  ],
  dc_site: ['DC-East', 'DC-West', 'DC-North', 'DC-South', 'DC-Central', 'DC1', 'DC2', 'DC3', 'DC4', 'DC5'],
  dc_building: ['Building-A', 'Building-B', 'Building-C', 'Building-D', 'Building-E', 'Other'],
  allocation: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database'],
  environment: ['Production', 'Testing', 'Pre-Production', 'Development'],
  status: ['Active', 'Ready', 'Inactive', 'Maintenance', 'Decommissioned', 'Retired'],
  device_type: ['Server', 'Storage', 'Network']
} as const;

interface ServerImportRow {
  serial_number?: string;
  hostname: string;
  brand?: string;
  model?: string;
  ip_address?: string;
  ip_oob?: string;
  operating_system?: string;
  dc_site: string;
  dc_building?: string;
  dc_floor?: string;
  dc_room?: string;
  allocation?: string;
  environment?: string;
  status: string;
  device_type: string;
  rack?: string;
  unit?: string;
  warranty?: string;
  notes?: string;
  [key: string]: string | undefined;
}

interface BulkImportProps {
  onImportComplete: (count: number) => void;
}

const BulkImport = ({ onImportComplete }: BulkImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { enums, loading: enumsLoading } = useEnums();

  // Map enums to match validEnums structure
  const mappedValidEnums: ValidEnums = {
    brand: enums.brands,
    model: enums.models,
    operating_system: enums.osTypes,
    dc_site: enums.sites,
    dc_building: enums.buildings,
    allocation: enums.allocationTypes,
    environment: enums.environmentTypes,
    status: enums.status,
    device_type: enums.deviceTypes
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setImportResults(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file",
          variant: "destructive"
        });
      }
    }
  };

  const validateRow = (row: ServerImportRow): string[] => {
    const errors: string[] = [];
    
    // Check required fields based on NOT NULL constraints
    const requiredFields: (keyof ServerImportRow)[] = ['hostname', 'dc_site', 'device_type'];
    
    requiredFields.forEach(field => {
      if (!row[field]?.trim()) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate enum values with case sensitivity
    (Object.entries(mappedValidEnums) as [ValidEnumKey, readonly string[]][]).forEach(([field, validValues]) => {
      const value = row[field];
      if (value && !validValues.includes(value)) {
        errors.push(`Invalid ${field}: "${value}". Must be one of: ${validValues.join(', ')}`);
      }
    });

    // Validate IP addresses (both ip_address and ip_oob are optional but must be valid if provided)
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (row.ip_address && !ipRegex.test(row.ip_address)) {
      errors.push(`Invalid IP address: ${row.ip_address}`);
    }
    if (row.ip_oob && !ipRegex.test(row.ip_oob)) {
      errors.push(`Invalid OOB IP address: ${row.ip_oob}`);
    }

    // Validate warranty date format (YYYY-MM-DD) - optional but must be valid if provided
    if (row.warranty) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.warranty)) {
        errors.push(`Invalid warranty date format: ${row.warranty}. Use YYYY-MM-DD format.`);
      } else {
        const date = new Date(row.warranty);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid warranty date: ${row.warranty}`);
        } else if (date < new Date()) {
          // Warn but don't block import for past warranty dates
          console.warn(`Warning: Warranty date ${row.warranty} is in the past`);
        }
      }
    }

    return errors;
  };

  const parseCSV = (content: string): ServerImportRow[] => {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error("File must contain at least a header and one data row");
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s-]/g, '_'));
    const requiredHeaders = ['hostname', 'dc_site', 'device_type'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const row: Partial<ServerImportRow> = {};
      
      headers.forEach((header, i) => {
        if (values[i] !== undefined) {
          row[header as keyof ServerImportRow] = values[i] || undefined;
        }
      });
      
      return row as ServerImportRow;
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      const content = await file.text();
      const rows = parseCSV(content);
      let successCount = 0;
      const errors: string[] = [];

      // Process each row with progress updates
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors = validateRow(row);

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 2}: ${rowErrors.join('; ')}`);
        } else {
          try {
            // TODO: Replace with actual API call to save the server
            // await saveServer(row);
            successCount++;
          } catch (error) {
            errors.push(`Row ${i + 2}: Failed to save - ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Update progress
        setImportProgress(((i + 1) / rows.length) * 100);
      }

      const failedCount = rows.length - successCount;
      const results = {
        success: successCount,
        failed: failedCount,
        errors
      };

      setImportResults(results);
      onImportComplete(successCount);

      // Show success/error toast
      if (errors.length === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${successCount} servers`,
          variant: "default"
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${successCount} servers, ${failedCount} failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive"
      });
      
      setImportResults({
        success: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error during import"]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'hostname',           // Required
      'dc_site',            // Required
      'device_type',        // Required
      'serial_number',      // Optional
      'brand',              // Optional
      'model',              // Optional
      'ip_address',         // Optional
      'ip_oob',             // Optional
      'operating_system',   // Optional
      'dc_building',        // Optional
      'dc_floor',           // Optional
      'dc_room',            // Optional
      'allocation',         // Optional
      'environment',        // Optional
      'status',             // Optional
      'rack',               // Optional
      'unit',               // Optional
      'warranty',           // Optional (YYYY-MM-DD format)
      'notes'               // Optional
    ].join(',');
    
    const exampleData = [
      [
        'server-01',            // hostname
        'DC-East',              // dc_site
        'Server',               // device_type
        'SER12345',             // serial_number
        'Dell',                 // brand
        'PowerEdge R740',       // model
        '192.168.1.100',        // ip_address
        '10.0.0.1',            // ip_oob
        'Ubuntu 22.04 LTS',     // operating_system
        'Building-A',           // dc_building
        '1',                    // dc_floor
        '101',                  // dc_room
        'IAAS',                 // allocation
        'Production',           // environment
        'Active',               // status
        'RACK-01',             // rack
        'U42',                 // unit
        '2025-12-31',          // warranty
        'Primary production server' // notes
      ],
      [
        'db-primary-01',
        'DC-West',
        'Server',
        'SN2345678',
        'HPE',
        'ProLiant DL380',
        '192.168.1.101',
        '10.0.0.2',
        'Oracle Linux 8',
        'Building-B',
        '2',
        '205',
        'Database',
        'Production',
        'Active',
        'RACK-02',
        'U12',
        '2027-06-30',
        'Primary database server'
      ],
      [
        'storage-01',
        'DC-North',
        'Storage',
        'SN3456789',
        'Dell',
        'PowerVault ME4',
        '192.168.1.102',
        '10.0.0.3',
        'Storage OS 2.1',
        'Building-C',
        '1',
        '110',
        'PAAS',
        'Production',
        'Active',
        'RACK-03',
        'U1-U4',
        '2026-09-30',
        'Primary storage array'
      ],
      [
        'fw-01',
        'DC-South',
        'Network',
        'SN4567890',
        'Cisco',
        'ASA 5525-X',
        '192.168.1.103',
        '10.0.0.4',
        'Cisco ASA 9.16',
        'Building-A',
        '1',
        '103',
        'Load Balancer',
        'Production',
        'Active',
        'RACK-01',
        'U1',
        '2025-03-31',
        'Main firewall'
      ],
      [
        'switch-core-01',
        'DC-Central',
        'Network',
        'SN5678901',
        'Cisco',
        'Nexus 93180YC-EX',
        '192.168.2.100',
        '10.0.1.1',
        'NX-OS 9.3',
        'Building-D',
        '1',
        'MDF',
        'Load Balancer',
        'Production',
        'Active',
        'RACK-04',
        'U42-U44',
        '2026-12-31',
        'Core network switch'
      ],
      [
        'dev-app-01',
        'DC-East',
        'Server',
        'SN6789012',
        'Dell',
        'PowerEdge R750',
        '192.168.2.101',
        '10.0.1.2',
        'CentOS 7',
        'Building-A',
        '2',
        '210',
        'IAAS',
        'Development',
        'Active',
        'RACK-05',
        'U15',
        '2024-12-31',
        'Development application server'
      ],
      [
        'test-web-01',
        'DC-West',
        'Server',
        'SN7890123',
        'HPE',
        'ProLiant DL360',
        '192.168.3.100',
        '10.0.2.1',
        'Ubuntu 20.04 LTS',
        'Building-B',
        '3',
        '315',
        'PAAS',
        'Testing',
        'Active',
        'RACK-06',
        'U22',
        '2025-06-30',
        'Test web server'
      ]
    ];
    
    const csvContent = [headers, ...exampleData.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'server_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded successfully"
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Bulk Import Servers</CardTitle>
        <CardDescription>
          Import multiple servers at once using a CSV file. Download the template below for the correct format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="cursor-pointer"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {file ? file.name : 'No file selected'}
            </p>
          </div>

          <div className="flex justify-between items-center">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              disabled={isImporting}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isImporting}
            >
              {isImporting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Servers'
              )}
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-medium mb-2">Import Instructions</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Required columns:</strong> hostname, dc_site, device_type</p>
              <p><strong>Optional columns:</strong> serial_number, brand, model, ip_address, ip_oob, operating_system, dc_building, dc_floor, dc_room, allocation, environment, status, rack, unit, warranty, notes</p>
              <p><strong>Status values:</strong> {validEnums.status.join(', ')}</p>
              <p><strong>Device types:</strong> {validEnums.device_type.join(', ')}</p>
              <p><strong>File format:</strong> CSV (comma-separated values)</p>
              <p><strong>Note:</strong> First row must contain column headers</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkImport;