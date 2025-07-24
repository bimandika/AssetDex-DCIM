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
        return;
      }

      // If we get here, all rows are valid - proceed with import
      for (const { row } of validation) {
        try {
          // Prepare the data for upsert
          const { id, ...rowData } = row;
          const { error } = await supabase
            .from('servers')
            .upsert(rowData, { onConflict: 'hostname' });

          if (error) throw error;
          results.success++;
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Row ${row.id}: ${errorMessage}`);
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

  const downloadTemplate = useCallback(() => {
    // Create CSV header row with required fields and common optional fields
    const headers = [
      ...REQUIRED_FIELDS,
      'brand',
      'model',
      'ip_address',
      'ip_oob',
      'operating_system',
      'dc_building',
      'dc_floor',
      'dc_room',
      'allocation',
      'environment',
      'rack',
      'unit',
      'warranty',
      'notes'
    ];
    
    // Create example data for the template
    const exampleData = headers.map(header => {
      if (header === 'hostname') return 'server-01';
      if (header === 'dc_site') return 'DC1';
      if (header === 'device_type') return 'Server';
      if (header === 'serial_number') return 'SER12345';
      if (header === 'status') return 'Active';
      if (header === 'ip_address') return '192.168.1.10';
      if (header === 'ip_oob') return '10.0.0.1';
      if (header === 'allocation') return 'IAAS';
      if (header === 'environment') return 'Production';
      if (header === 'rack') return 'RACK-01';
      if (header === 'unit') return 'U42';
      return ''; // Empty for other fields
    });
    
    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n');
    
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
  }, [toast]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Bulk Import Servers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to import multiple servers at once. The first row should contain column headers.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid w-full items-center gap-4">
          {/* File Input */}
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/50 transition-colors"
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
  );
};

export default BulkImport;