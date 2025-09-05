# Backup and Restore Plan for AssetDex DCIM System

## Overview
Comprehensive backup and restore strategy for the AssetDex Data Center Infrastructure Management (DCIM) system, covering all critical data including servers, racks, dashboards, device glossary, and user management.

## Critical Data Categories

### 1. Core Infrastructure Data
- **Servers**: Hardware inventory, specifications, locations
- **Racks**: Physical rack layouts, power, cooling
- **Data Centers**: Site information, rooms, floors
- **Network Equipment**: Switches, routers, connections

### 2. Device Glossary Data
- **Device Specifications**: CPU, memory, storage, network specs
- **Manufacturer Information**: Models, compatibility data
- **Technical Documentation**: Datasheets, images

### 3. User and Security Data
- **User Accounts**: Authentication, profiles
- **Permissions**: Role-based access control
- **Audit Logs**: Activity tracking, changes

### 4. Dashboard and Configuration Data
- **Dashboard Layouts**: Widget configurations
- **Custom Views**: User preferences, filters
- **System Settings**: Application configuration

## Database Tables to Backup

### Core System Tables
```sql
-- Infrastructure
servers
racks
data_centers
rooms
floors
network_equipment

-- Location hierarchy
server_positions
rack_positions

-- Device Glossary (New tables)
device_glossary
device_cpu_specs
device_memory_specs
device_storage_specs
device_network_specs
device_power_specs
device_management_specs
device_compatibility

-- User Management
auth.users
user_profiles
user_preferences
roles
permissions
user_roles

-- Dashboard & Analytics
dashboard_configs
dashboard_widgets
custom_reports
saved_filters

-- Activity & Audit
activity_logs
change_history
system_events

-- Configuration
system_settings
notification_settings
integration_configs
```

## Backup Strategy

### 1. Backend Database Backup via API

#### Backend API Implementation
```typescript
// src/api/backup.ts
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BackupService {
  private backupDir = process.env.BACKUP_DIR || '/var/backups/assetdx-dcim';
  private dbName = process.env.DB_NAME || 'assetdx_dcim';
  private dbHost = process.env.DB_HOST || 'localhost';
  private dbUser = process.env.DB_USER || 'postgres';

  // Create database backup
  async createBackup(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = backupName || `backup_${timestamp}.dump`;
    const filePath = `${this.backupDir}/${fileName}`;

    try {
      // Create backup directory if it doesn't exist
      await execAsync(`mkdir -p ${this.backupDir}`);

      // Run pg_dump to create backup
      const dumpCommand = `pg_dump -h ${this.dbHost} -U ${this.dbUser} -d ${this.dbName} --format=custom --compress=9 --file=${filePath}`;
      
      await execAsync(dumpCommand);
      
      return fileName;
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  // List available backups
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const { stdout } = await execAsync(`ls -la ${this.backupDir}/*.dump 2>/dev/null || echo ""`);
      
      const backups: BackupInfo[] = [];
      const lines = stdout.trim().split('\n').filter(line => line.includes('.dump'));
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const fileName = parts[parts.length - 1].split('/').pop();
        const size = parts[4];
        const date = `${parts[5]} ${parts[6]} ${parts[7]}`;
        
        backups.push({
          id: fileName,
          name: fileName,
          size: size,
          createdAt: new Date(date),
          path: `${this.backupDir}/${fileName}`
        });
      }
      
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  // Restore database from backup
  async restoreBackup(backupId: string): Promise<void> {
    const backupPath = `${this.backupDir}/${backupId}`;
    
    try {
      // Verify backup file exists
      await execAsync(`test -f ${backupPath}`);

      // Drop existing database and recreate
      await execAsync(`dropdb -h ${this.dbHost} -U ${this.dbUser} ${this.dbName} --if-exists`);
      await execAsync(`createdb -h ${this.dbHost} -U ${this.dbUser} ${this.dbName}`);

      // Restore from backup
      const restoreCommand = `pg_restore -h ${this.dbHost} -U ${this.dbUser} -d ${this.dbName} --verbose --clean --if-exists ${backupPath}`;
      
      await execAsync(restoreCommand);
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  // Delete backup file
  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = `${this.backupDir}/${backupId}`;
    
    try {
      await execAsync(`rm -f ${backupPath}`);
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  // Download backup file
  async downloadBackup(backupId: string): Promise<string> {
    const backupPath = `${this.backupDir}/${backupId}`;
    
    try {
      // Verify file exists
      await execAsync(`test -f ${backupPath}`);
      return backupPath;
    } catch (error) {
      throw new Error(`Backup file not found: ${error.message}`);
    }
  }
}

export interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: Date;
  path: string;
}
```

### 2. REST API Endpoints

```typescript
// src/routes/backup.ts
import { Router, Request, Response } from 'express';
import { BackupService } from '../services/backup.service';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const backupService = new BackupService();

// Create backup
router.post('/api/admin/backup', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const backupId = await backupService.createBackup(name);
    
    res.json({ 
      success: true, 
      backupId, 
      message: 'Backup created successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// List backups
router.get('/api/admin/backups', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Restore backup
router.post('/api/admin/restore/:backupId', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    await backupService.restoreBackup(backupId);
    
    res.json({ 
      success: true, 
      message: 'Database restored successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Download backup
router.get('/api/admin/backup/:backupId/download', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    const filePath = await backupService.downloadBackup(backupId);
    
    res.download(filePath, backupId);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete backup
router.delete('/api/admin/backup/:backupId', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    await backupService.deleteBackup(backupId);
    
    res.json({ 
      success: true, 
      message: 'Backup deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
```

### 3. Frontend React Components

#### Backup Management Page
```typescript
// src/components/admin/BackupManagement.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Trash2, RefreshCw, Database, AlertCircle } from 'lucide-react';

interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: Date;
}

export default function BackupManagement() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      setMessage({type: 'error', text: 'Failed to load backups'});
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: backupName || undefined })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({type: 'success', text: 'Backup created successfully'});
        setBackupName('');
        loadBackups();
      } else {
        setMessage({type: 'error', text: result.message});
      }
    } catch (error) {
      setMessage({type: 'error', text: 'Failed to create backup'});
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('This will replace all current data. Are you sure?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/restore/${backupId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({type: 'success', text: 'Database restored successfully'});
      } else {
        setMessage({type: 'error', text: result.message});
      }
    } catch (error) {
      setMessage({type: 'error', text: 'Failed to restore backup'});
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      setMessage({type: 'success', text: 'Starting download...'});
      
      const response = await fetch(`/api/admin/backup/${backupId}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = backupId;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setMessage({type: 'success', text: 'Backup downloaded successfully'});
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      setMessage({type: 'error', text: 'Failed to download backup'});
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/backup/${backupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({type: 'success', text: 'Backup deleted successfully'});
        loadBackups();
      } else {
        setMessage({type: 'error', text: result.message});
      }
    } catch (error) {
      setMessage({type: 'error', text: 'Failed to delete backup'});
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <Button onClick={loadBackups} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Backup name (optional)"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={createBackup} 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Creates a complete backup of all database tables including servers, racks, device glossary, users, and dashboards.
          </p>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No backups available. Create your first backup above.
            </p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{backup.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(backup.createdAt).toLocaleString()} • {backup.size}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBackup(backup.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => restoreBackup(backup.id)}
                      disabled={loading}
                    >
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Simple Implementation Plan

### 1. Environment Setup
```bash
# Environment variables (.env)
BACKUP_DIR=/var/backups/assetdx-dcim
DB_NAME=assetdx_dcim
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. Backend Integration
```typescript
// Add to your main app.ts or server.ts
import backupRoutes from './routes/backup';

app.use(backupRoutes);
```

### 3. Frontend Navigation
```typescript
// Add to your admin navigation menu
const adminMenuItems = [
  // ...existing items
  {
    title: "Backup & Restore",
    href: "/admin/backup",
    icon: Database,
    description: "Manage database backups"
  }
];
```

### 4. Required Permissions
- Only admin users can access backup functionality
- Backup files stored with restricted permissions
- All operations logged for audit trail

## Security Considerations

### 1. Access Control
- Backup endpoints protected by admin authentication
- File system permissions restrict backup directory access
- Database credentials stored in environment variables

### 2. Audit Logging
```typescript
// Add to backup operations
import { auditLogger } from '../services/audit';

// Log backup creation
auditLogger.log({
  action: 'BACKUP_CREATED',
  userId: req.user.id,
  details: { backupId, timestamp: new Date() }
});

// Log restore operation  
auditLogger.log({
  action: 'DATABASE_RESTORED',
  userId: req.user.id,
  details: { backupId, timestamp: new Date() }
});
```

## Implementation Checklist

### Initial Setup
- [ ] Add BackupService to backend
- [ ] Create backup API routes  
- [ ] Add BackupManagement component to frontend
- [ ] Set up backup directory permissions
- [ ] Configure environment variables
- [ ] Test backup and restore functionality

### Deployment
- [ ] Ensure PostgreSQL pg_dump/pg_restore tools available
- [ ] Create backup directory on server
- [ ] Set proper file permissions
- [ ] Add backup route to admin navigation
- [ ] Test with sample data

## Conclusion

This simplified backup and restore plan provides essential database backup functionality through a clean web interface. Users can create, download, restore, and manage backups directly from the frontend without needing shell scripts or complex automation. The system is secure, user-friendly, and covers all critical DCIM data including servers, racks, device glossary, users, and dashboards.
