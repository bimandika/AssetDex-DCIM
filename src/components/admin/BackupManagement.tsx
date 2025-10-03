import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Database, 
  AlertCircle, 
  Loader2,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import UserMenu from '@/components/UserMenu';

interface BackupInfo {
  id: string;
  name: string;
  filename: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  lastModified: string;
  path: string;
  type: string;
}

export default function BackupManagement() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("DCIMS");
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
    
    // Load organization name from localStorage
    const savedName = localStorage.getItem('organizationName');
    if (savedName) {
      setOrganizationName(savedName);
    }

    // Check if custom logo exists
    const checkLogoExists = () => {
      const img = document.createElement('img');
      img.onload = () => setHasCustomLogo(true);
      img.onerror = () => setHasCustomLogo(false);
      img.src = '/logo.png?' + Date.now();
    };
    checkLogoExists();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      
      // Follow UserManagement pattern for API calls
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'list' },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;
      
      setBackups(data.backups || []);
      console.log('Loaded backups:', data.backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
      
      // Check if it's actually an error or just no backups found
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isEmptyState = errorMessage.includes('No backups found') || 
                          errorMessage.includes('bucket does not exist') ||
                          errorMessage.includes('NotFound');
      
      if (!isEmptyState) {
        toast({
          title: "Error",
          description: "Failed to load backups",
          variant: "destructive",
        });
      }
      
      // Set empty array for empty state
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      // Ensure user session exists (following UserManagement pattern)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { 
          action: 'create',
          backup_name: backupName || undefined
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Backup created successfully (${data.size} bytes)`,
      });
      
      setBackupName('');
      await loadBackups(); // Refresh the list
    } catch (error) {
      console.error('Backup creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    setDownloading(backupId);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('No active session');
      }

      // Create a temporary link to download the file
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-backup?action=download&backup_id=${encodeURIComponent(backupId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupId;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Backup downloaded successfully",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Error",
        description: "Failed to download backup",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm(`Are you sure you want to delete backup "${backupId}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(backupId);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('No active session');
      }

      const { error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'delete', backup_id: backupId },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
      
      await loadBackups(); // Refresh the list
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm(`Are you sure you want to restore from "${backupId}"? This will overwrite the current database. This action cannot be undone.`)) {
      return;
    }

    setRestoring(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { 
          action: 'restore',
          backup_id: backupId
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Database restored successfully. ${data.executed_statements} SQL statements executed.`,
      });
      
      // Suggest page refresh after restore
      setTimeout(() => {
        if (confirm('Database has been restored. Would you like to refresh the page to see the changes?')) {
          window.location.reload();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: "Error",
        description: "Failed to restore backup",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasCustomLogo ? (
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                  <img
                    src={'/logo.png?' + Date.now()}
                    alt="Organization Logo"
                    className="h-8 w-8 object-contain"
                    onError={() => setHasCustomLogo(false)}
                  />
                </div>
              ) : (
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {organizationName}
                </h1>
                <p className="text-sm text-slate-600">Backup & Restore Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                System Online
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Backup & Restore</h2>
          <p className="text-slate-600 mt-1">Manage database backups and system recovery</p>
        </div>
        <Button onClick={loadBackups} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Create Backup Section */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Database className="w-5 h-5 text-blue-600" />
            Create New Backup
          </CardTitle>
          <CardDescription>
            Create a complete backup of all database tables including servers, racks, device glossary, users, and dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Backup name (optional)"
              value={backupName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBackupName(e.target.value)}
              className="flex-1"
              disabled={loading}
            />
            <Button 
              onClick={createBackup} 
              disabled={loading}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
          
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Backup Information</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Complete database snapshot including all tables and data</li>
                  <li>• Includes server inventory, rack configurations, and user accounts</li>
                  <li>• Device glossary, dashboard settings, and activity logs</li>
                  <li>• Comprehensive SQL format for reliable restoration</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Backups Section */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Available Backups</CardTitle>
              <CardDescription>
                {loading && backups.length === 0 
                  ? 'Loading backup information...' 
                  : backups.length === 0 
                    ? 'No backups available yet - create your first backup to get started' 
                    : `${backups.length} backup${backups.length !== 1 ? 's' : ''} available`
                }
              </CardDescription>
            </div>
            {backups.length > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {backups.length} Total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Loading backups...</p>
              </div>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Ready to create your first backup</h3>
              <p className="text-slate-600 mb-4">
                Start protecting your data by creating a complete backup of your datacenter inventory. 
                This includes all servers, racks, configurations, and user settings.
              </p>
              <Button onClick={createBackup} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Database className="w-4 h-4 mr-2" />
                Create First Backup
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{backup.name}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>{backup.size}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            Complete
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {/* Download Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBackup(backup.id)}
                      disabled={downloading === backup.id || loading}
                      className="flex items-center gap-2"
                    >
                      {downloading === backup.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    
                    {/* Restore Button */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => restoreBackup(backup.id)}
                      disabled={restoring || loading}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                      {restoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                      disabled={deletingId === backup.id || loading}
                      className="flex items-center gap-2"
                    >
                      {deletingId === backup.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Warning */}
      {backups.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Warning:</strong> Restoring a backup will overwrite all current data. 
            Make sure to create a current backup before restoring from an older one.
          </AlertDescription>
        </Alert>
      )}
        </div>
      </main>
    </div>
  );
}
