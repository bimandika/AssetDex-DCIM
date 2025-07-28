import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerEnums } from "@/hooks/useServerEnums";
import { Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Import the ServerEnums type from the enums file
import type { ServerEnums } from "@/types/enums";

// ServerImportRow represents a row of server data being imported

// ServerImportRow represents a row of server data being imported
type ServerImportRow = Omit<Database['public']['Tables']['servers']['Insert'], 'id' | 'created_at' | 'updated_at'> & {
  id?: number;
  rack?: string | null;
  unit?: string | null;
  allocation?: string | null;
  environment?: string | null;
  [key: string]: unknown; // Allow additional properties for dynamic fields
};

// Required fields for validation
const REQUIRED_FIELDS = [
  'hostname',
  'dc_site',
  'device_type',
  'status',
  'serial_number',
] as const;

// Type for import results
interface ImportResults {
  success: number;
  failed: number;
  errors: string[];
}

// Type for validation results
interface ValidationResult {
  row: ServerImportRow;
  errors: string[];
}



const BulkImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  
  const { toast } = useToast();
  const { enums: serverEnums } = useServerEnums();
  
  // Function to validate enum values
  const validateEnum = useCallback((value: unknown, enumType: keyof ServerEnums): boolean => {
    if (!serverEnums || !serverEnums[enumType]) return false;
    const enumValues = serverEnums[enumType];
    return Array.isArray(enumValues) && enumValues.some(v => String(v) === String(value));
  }, [serverEnums]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResults(null);
      setValidationResults([]);
    }
  };

  const parseCSV = useCallback(async (file: File): Promise<ServerImportRow[]> => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      return lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row: Partial<ServerImportRow> = { id: index + 1 };
        
        // Map headers to row data
        headers.forEach((header, i) => {
          if (values[i] !== undefined) {
            // Convert empty strings to null for database compatibility
            row[header as keyof ServerImportRow] = values[i] || null;
          }
        });
        
        // Ensure required fields are present
        REQUIRED_FIELDS.forEach(field => {
          if (row[field as keyof ServerImportRow] === undefined) {
            row[field as keyof ServerImportRow] = '';
          }
        });
        
        return row as ServerImportRow;
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw error;
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to import',
        variant: 'destructive',
      });
      return;
    }

    if (!serverEnums) {
      toast({
        title: 'Server data not loaded',
        description: 'Please wait while we load the required data',
        variant: 'destructive',
      });
      return;
    }

    // Check if we have all required enums loaded
    const requiredEnums = ['status', 'deviceTypes', 'allocationTypes', 'environmentTypes', 'racks', 'units'];
    const missingEnums = requiredEnums.filter(type => !serverEnums[type as keyof ServerEnums] || serverEnums[type as keyof ServerEnums]?.length === 0);
    
    if (missingEnums.length > 0) {
      toast({
        title: 'Missing enum data',
        description: `The following enum types are missing or empty: ${missingEnums.join(', ')}. Please make sure they are configured in the system.`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    setImportResults(null);
    setValidationResults([]);

    try {
      // Read and parse the CSV file
      const rows = await parseCSV(file);
      const validation: ValidationResult[] = [];
      const results: ImportResults = { success: 0, failed: 0, errors: [] };

      // Validate each row
      for (const row of rows) {
        const errors: string[] = [];

        // Check required fields
        for (const field of REQUIRED_FIELDS) {
          const value = row[field as keyof ServerImportRow];
          if (value === undefined || value === null || value === '') {
            errors.push(`Missing required field: ${field}`);
          }
        }

        // Check enum values
        if (row.rack && !validateEnum(row.rack, 'racks')) {
          errors.push(`Invalid rack value: ${row.rack}`);
        }
        if (row.unit && !validateEnum(row.unit, 'units')) {
          errors.push(`Invalid unit value: ${row.unit}`);
        }
        if (row.allocation && !validateEnum(row.allocation, 'allocationTypes')) {
          errors.push(`Invalid allocation value: ${row.allocation}`);
        }
        if (row.environment && !validateEnum(row.environment, 'environmentTypes')) {
          errors.push(`Invalid environment value: ${row.environment}`);
        }
        if (row.device_type && !validateEnum(row.device_type, 'deviceTypes')) {
          errors.push(`Invalid device type: ${row.device_type}`);
        }
        if (row.status && !validateEnum(row.status, 'status')) {
          errors.push(`Invalid status: ${row.status}`);
        }

        validation.push({ row, errors });
      }

      const invalidRows = validation.filter(v => v.errors.length > 0);
      setValidationResults(validation);
      
      if (invalidRows.length > 0) {
        toast({
          title: 'Validation failed',
          description: `Found ${invalidRows.length} rows with errors. Please fix them before importing.`,
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      // If we get here, all rows are valid - proceed with import
      for (const { row } of validation) {
        try {
          // Prepare the data for insert/update
          const { id, ...rowData } = row;
          
          // First, check if a server with this hostname already exists
          const { data: existingServer, error: fetchError } = await supabase
            .from('servers')
            .select('id')
            .eq('hostname', row.hostname)
            .maybeSingle();
            
          if (fetchError) throw fetchError;
          
          let error;
          
          if (existingServer) {
            // Update existing server
            const { error: updateError } = await supabase
              .from('servers')
              .update(rowData)
              .eq('hostname', row.hostname);
              
            error = updateError;
          } else {
            // Insert new server
            const { error: insertError } = await supabase
              .from('servers')
              .insert([rowData]);
              
            error = insertError;
          }
          
          if (error) throw error;
          results.success++;
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Row ${row.id} (${row.hostname}): ${errorMessage}`);
        }
      }

      setImportResults(results);
      
      if (results.failed === 0) {
        toast({
          title: 'Import successful',
          description: `Successfully imported ${results.success} servers.`,
        });
      } else {
        toast({
          title: 'Import completed with errors',
          description: `Imported ${results.success} servers, ${results.failed} failed.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'An error occurred while processing the file.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [file, serverEnums]);

  const downloadTemplate = useCallback(async () => {
    if (!serverEnums) {
      toast({
        title: 'Data not loaded',
        description: 'Please wait while we load the required data',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Default columns that we know should be included
      const defaultColumns = [
        'hostname', 'dc_site', 'device_type', 'status', 'serial_number',
        'brand', 'model', 'ip_address', 'ip_oob', 'operating_system',
        'dc_building', 'dc_floor', 'dc_room', 'allocation', 'environment',
        'rack', 'unit', 'warranty', 'notes'
      ];
      
      // Get the first available value from each enum for the template
      const getFirstEnumValue = (type: keyof ServerEnums): string => {
        const values = serverEnums[type];
        return Array.isArray(values) && values.length > 0 ? values[0] : '';
      };

      // Define column mappings and default values
      const columnDefaults: Record<string, string> = {
        hostname: 'server-01',
        dc_site: 'DC1',
        serial_number: 'SER12345',
        ip_address: '192.168.1.10',
        ip_oob: '10.0.0.1',
        dc_building: 'Building A',
        dc_floor: '1',
        dc_room: 'Server Room 101',
        brand: 'Dell',
        model: 'PowerEdge R740',
        operating_system: 'Ubuntu 22.04 LTS',
        warranty: '2025-12-31',
        notes: 'Example note'
      };

      // Map enum types to server columns
      const enumMappings: Record<string, keyof ServerEnums> = {
        status: 'status',
        device_type: 'deviceTypes',
        allocation: 'allocationTypes',
        environment: 'environmentTypes',
        rack: 'racks',
        unit: 'units'
      };

      // Create example data for the template with valid enum values
      const exampleData = defaultColumns.map((header: string) => {
        // Handle enum fields
        const enumType = enumMappings[header];
        if (enumType) {
          const value = getFirstEnumValue(enumType);
          if (value) return value;
          
          // Fallback values if enum is empty
          const fallbacks: Record<string, string> = {
            status: 'Active',
            device_type: 'Server',
            allocation: 'IAAS',
            environment: 'Production',
            rack: 'RACK-01',
            unit: 'U42'
          };
          return fallbacks[header] || '';
        }
        
        // Use default value if defined
        if (header in columnDefaults) {
          return columnDefaults[header];
        }
        
        // Empty for other optional fields
        return '';
      });
      
      // Create CSV header row
      const headerRow = defaultColumns.join(',');
      
      // Create CSV data row with proper escaping
      const dataRow = exampleData.map((value: string) => {
        // Escape quotes and wrap in quotes if the value contains commas or quotes
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(',');
      
      // Combine header and data rows
      const csvContent = [headerRow, dataRow].join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'server_import_template.csv');
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Template downloaded',
        description: 'CSV template has been downloaded successfully',
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: 'Error generating template',
        description: 'Failed to generate the CSV template. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return (
    <div className="w-full px-0 md:px-8 py-8">
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Bulk Import Servers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to import multiple servers at once. The first row should contain column headers.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full items-center gap-4">
            {/* File Input */}
            <div className="grid w-full items-center gap-1.5">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file ? file.name : 'CSV file (max 10MB)'}
                  </p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                />
              </label>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="min-w-[120px]"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadTemplate}
                disabled={isImporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={isImporting}
                  className="ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 text-sm text-muted-foreground">
              <h3 className="font-medium mb-2">Instructions:</h3>
              <p><strong>Required columns:</strong> hostname, dc_site, device_type, status, serial_number</p>
              <p><strong>Optional columns:</strong> brand, model, ip_address, ip_oob, operating_system, dc_building, dc_floor, dc_room, allocation, environment, rack, unit, warranty, notes</p>
              <p className="mt-2"><strong>Status values:</strong> {Array.isArray(serverEnums?.status) ? serverEnums.status.join(', ') : 'Loading...'}</p>
              <p><strong>Device types:</strong> {Array.isArray(serverEnums?.deviceTypes) ? serverEnums.deviceTypes.join(', ') : 'Loading...'}</p>
              <p><strong>Allocation types:</strong> {Array.isArray(serverEnums?.allocationTypes) ? serverEnums.allocationTypes.join(', ') : 'Loading...'}</p>
              <p><strong>Environment types:</strong> {Array.isArray(serverEnums?.environmentTypes) ? serverEnums.environmentTypes.join(', ') : 'Loading...'}</p>
              <p><strong>Racks:</strong> {Array.isArray(serverEnums?.racks) ? serverEnums.racks.slice(0, 5).join(', ') + (serverEnums.racks.length > 5 ? '...' : '') : 'Loading...'}</p>
              <p><strong>Units:</strong> {Array.isArray(serverEnums?.units) ? serverEnums.units.slice(0, 5).join(', ') + (serverEnums.units.length > 5 ? '...' : '') : 'Loading...'}</p>
            </div>

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-medium">
                  Validation Results ({validationResults.filter(v => v.errors.length > 0).length} issues found)
                </h3>
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {validationResults
                      .filter(v => v.errors.length > 0)
                      .map((result, i) => (
                        <div key={i} className="border-b border-border last:border-b-0 p-3 text-sm">
                          <div className="font-medium mb-1">Row {result.row.id}:</div>
                          <ul className="list-disc pl-5 space-y-1">
                            {result.errors.map((error, j) => (
                              <li key={j} className="text-destructive">{error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Import Results */}
            {importResults && (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium">
                  Import Results
                </h3>
                <div className="rounded-md bg-muted/50 p-4">
                  <p className="text-sm">
                    Successfully imported: <span className="font-medium">{importResults.success}</span>
                  </p>
                  {importResults.failed > 0 && (
                    <p className="text-sm text-destructive mt-1">
                      Failed: {importResults.failed}
                    </p>
                  )}
                  {importResults.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {importResults.errors.slice(0, 5).map((error, i) => (
                          <li key={i} className="text-destructive">{error}</li>
                        ))}
                        {importResults.errors.length > 5 && (
                          <li className="text-muted-foreground">...and {importResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkImport;