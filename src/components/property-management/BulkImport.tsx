
import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate file processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error("File must contain at least a header and one data row");
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['serialNumber', 'brand'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Basic validation
          if (!row.serialNumber || !row.brand) {
            failedCount++;
            errors.push(`Row ${i}: Missing required fields`);
          } else {
            successCount++;
            // Here you would actually save to your database
            console.log('Importing server:', row);
          }

          setImportProgress((i / (lines.length - 1)) * 100);
        }

        setImportResults({ success: successCount, failed: failedCount, errors });
        onImportComplete(successCount);
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} servers${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
      };

      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'serialNumber,brand,model,location,rack,unit,ipOOB,ipOS,tenant,os,status,warranty,notes',
      'SN001234567,Dell,PowerEdge R740,DC-East,A-12,U15-U16,192.168.1.101,10.0.1.101,Production,Ubuntu 22.04,Active,2025-03-15,Primary web server',
      'SN001234568,HPE,ProLiant DL380,DC-West,B-08,U20-U21,192.168.1.102,10.0.1.102,Development,CentOS 8,Maintenance,2024-12-20,Scheduled maintenance'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Bulk Import Servers</h3>
        <p className="text-slate-600">Import multiple servers from CSV or Excel files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>File Upload</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing server information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border-2 border-dashed border-slate-300 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-slate-400" />
              <div>
                <p className="font-medium">
                  {file ? file.name : "No file selected"}
                </p>
                <p className="text-sm text-slate-500">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV, XLS, XLSX files supported"}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file && (
            <div className="space-y-4">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Import Progress</Label>
                    <span className="text-sm text-slate-500">{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? "Importing..." : "Start Import"}
              </Button>
            </div>
          )}

          {importResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Successful</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {importResults.success}
                  </Badge>
                </div>
                
                {importResults.failed > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>Failed</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      {importResults.failed}
                    </Badge>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Errors:</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Required columns:</strong> serialNumber, brand</p>
            <p><strong>Optional columns:</strong> model, location, rack, unit, ipOOB, ipOS, tenant, os, status, warranty, notes</p>
            <p><strong>File formats:</strong> CSV, XLS, XLSX</p>
            <p><strong>Note:</strong> First row should contain column headers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkImport;
