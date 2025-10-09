import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManualActivityDialog } from '@/components/ManualActivityDialog';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Clock, 
  User, 
  Activity, 
  Shield, 
  Server, 
  Database,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Users,
  Settings,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Plus
} from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  severity: string;
  username?: string;
  email?: string;
}

interface FilterState {
  search: string;
  severity: string;
  action: string;
  resourceType: string;
  dateRange: string;
}

export default function ActivityLogsViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'severity'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    severity: 'all',
    action: 'all',
    resourceType: 'all',
    dateRange: 'all'
  });

  const fetchLogs = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Get authentication token
      const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
      
      console.log('Fetching logs with token:', token ? 'Present' : 'Missing');
      console.log('Fetching from:', `http://localhost:8000/functions/v1/activity-logs?limit=${itemsPerPage}&offset=${offset}`);
      
      const response = await fetch(
        `http://localhost:8000/functions/v1/activity-logs?limit=${itemsPerPage}&offset=${offset}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );
      
      console.log('Fetch response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Parsed data:', data);
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setLastRefresh(new Date());
      } else {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activity logs');
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, itemsPerPage]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, itemsPerPage]);

  const handleRefresh = () => {
    fetchLogs(true);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleSort = (column: 'timestamp' | 'action' | 'severity') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  // Function to mask sensitive data in activity logs
  const maskSensitiveData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = [
      'encrypted_password',
      'password',
      'password_hash',
      'recovery_token',
      'confirmation_token',
      'phone_change_token',
      'email_change_token_new',
      'email_change_token_current',
      'reauthentication_token',
      'access_token',
      'refresh_token',
      'api_key',
      'secret_key',
      'private_key',
      'session_token',
      'auth_token'
    ];
    
    const maskValue = (value: any, key: string): any => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (typeof value === 'string' && value.length > 0) {
          return '***MASKED***';
        }
        return value;
      }
      
      if (Array.isArray(value)) {
        return value.map((item, index) => maskValue(item, index.toString()));
      }
      
      if (typeof value === 'object' && value !== null) {
        return maskSensitiveData(value);
      }
      
      return value;
    };
    
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      masked[key] = maskValue(value, key);
    }
    
    return masked;
  };

  const getActionIcon = (action: string) => {
    if (!action) return <Activity className="w-4 h-4 text-blue-500" />;
    switch (action.toLowerCase()) {
      case 'create': case 'insert': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update': case 'modify': return <Settings className="w-4 h-4 text-blue-500" />;
      case 'delete': case 'remove': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'login': case 'signin': return <User className="w-4 h-4 text-green-500" />;
      case 'logout': case 'signout': return <User className="w-4 h-4 text-gray-500" />;
      case 'maintenance': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'component_replacement': return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'decommission': return <Activity className="w-4 h-4 text-red-500" />;
      case 'audit': return <Activity className="w-4 h-4 text-purple-500" />;
      case 'security_audit': return <Activity className="w-4 h-4 text-red-500" />;
      case 'site_visit': return <Activity className="w-4 h-4 text-green-500" />;
      case 'troubleshooting': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'health_check': return <Activity className="w-4 h-4 text-green-500" />;
      case 'custom': return <Activity className="w-4 h-4 text-gray-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getResourceIcon = (resourceType: string) => {
    if (!resourceType) return <Activity className="w-4 h-4 text-gray-500" />;
    switch (resourceType.toLowerCase()) {
      case 'users': case 'user': return <Users className="w-4 h-4 text-blue-500" />;
      case 'servers': case 'server': return <Server className="w-4 h-4 text-green-500" />;
      case 'database': case 'db': return <Database className="w-4 h-4 text-purple-500" />;
      case 'roles': case 'user_roles': return <Shield className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    if (!severity) return 'outline' as const;
    switch (severity.toLowerCase()) {
      case 'error': case 'critical': return 'destructive' as const;
      case 'warning': return 'secondary' as const;
      case 'info': case 'success': return 'default' as const;
      default: return 'outline' as const;
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (!severity) return <Activity className="w-3 h-3" />;
    switch (severity.toLowerCase()) {
      case 'error': case 'critical': return <XCircle className="w-3 h-3" />;
      case 'warning': return <AlertTriangle className="w-3 h-3" />;
      case 'info': return <Info className="w-3 h-3" />;
      case 'success': return <CheckCircle className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getProcessedLogs = () => {
    return logs
      .filter(log => {
        // Filter out noise like we did before
        if (log.details && Array.isArray(log.details.changed_fields)) {
          const fields = log.details.changed_fields;
          const uselessFields = ['updated_at', 'raw_user_meta_data'];
          if (fields.every((f: any) => uselessFields.includes(f))) {
            return false;
          }
        }
        if (log.resource_type === 'user_roles' && log.action === 'DELETE') {
          return false;
        }
        return true;
      })
      .map(log => {
        // Process log for display
        let actorUsername = log.username || '';
        if (!actorUsername) {
          let email = log.email;
          if (!email && log.details) {
            email = log.details.new_values?.email || log.details.old_values?.email || log.details.user_email;
          }
          if (email) {
            actorUsername = email.split('@')[0];
          } else if (log.user_id) {
            actorUsername = log.user_id.slice(0, 8) + '...';
          }
        }

        // Determine display action and description
        let displayAction = log.action;
        let description = '';
        let resourceDisplay = log.resource_type;

        // User creation detection
        const userCreationFields = [
          'id', 'aud', 'role', 'email', 'created_at', 'updated_at', 'instance_id'
        ];
        
        if (log.resource_type === 'users' && 
            log.details && 
            Array.isArray(log.details.changed_fields) &&
            userCreationFields.some(field => log.details.changed_fields.includes(field))) {
          displayAction = 'CREATE';
          const userEmail = log.details?.new_values?.email || log.email || '';
          description = `User ${userEmail.split('@')[0]} was created`;
          resourceDisplay = 'User';
        }
        // Login detection
        else if (log.resource_type === 'users' &&
                 log.details?.changed_fields?.includes('last_sign_in_at')) {
          displayAction = 'LOGIN';
          description = 'User signed in successfully';
          resourceDisplay = 'Session';
        }
        // Role change detection
        else if (log.resource_type === 'user_roles' && log.details?.new_values?.role) {
          displayAction = 'ROLE_CHANGE';
          const newRole = log.details.new_values.role;
          const userEmail = log.details?.user_email || '';
          description = `Role changed to ${newRole} for ${userEmail.split('@')[0]}`;
          resourceDisplay = 'User Role';
        }
        // Server operations
        else if (log.resource_type === 'servers') {
          const sn = log.details?.new_values?.serial_number || log.details?.old_values?.serial_number || '';
          const deviceType = log.details?.new_values?.device_type || log.details?.old_values?.device_type || 'Device';
          description = `${deviceType} ${sn || log.resource_id}`;
          resourceDisplay = 'Server';
        }
        // Manual activity detection
        else if (log.details?.manualEntry === true) {
          const resourceName = log.details?.resourceName || log.resource_id || 'Unknown';
          const activityType = log.details?.maintenanceType || log.details?.activityType || '';
          description = `${activityType ? activityType + ' on ' : ''}${resourceName}`;
          resourceDisplay = log.resource_type || 'Manual Entry';
        }

        return {
          ...log,
          actorUsername,
          displayAction,
          description,
          resourceDisplay
        };
      });
  };

  const processedLogs = getProcessedLogs();
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="relative flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Activity Logs
                </h1>
                <p className="text-gray-500 mt-1">Monitor system activities and user actions in real-time</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-900 transition-all"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 hover:bg-green-50 border-green-200 text-green-700 hover:text-green-900 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center space-x-2 hover:bg-purple-50 border-purple-200 text-purple-700 hover:text-purple-900 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowActivityDialog(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50 shadow-lg">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Search Activities</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search logs..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Severity Level</label>
                  <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Action Type</label>
                  <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Resource Type</label>
                  <Select value={filters.resourceType} onValueChange={(value) => setFilters(prev => ({ ...prev, resourceType: value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="servers">Servers</SelectItem>
                      <SelectItem value="user_roles">Roles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden bg-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Activities</p>
                  <p className="text-3xl font-bold">{totalCount.toLocaleString()}</p>
                  <p className="text-blue-100 text-xs mt-1">All time</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Activity className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Success Rate</p>
                  <p className="text-3xl font-bold">98.5%</p>
                  <p className="text-green-100 text-xs mt-1">Last 30 days</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold">24</p>
                  <p className="text-orange-100 text-xs mt-1">Currently online</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Last Hour</p>
                  <p className="text-3xl font-bold">{processedLogs.filter(log => {
                    const logTime = new Date(log.timestamp).getTime();
                    const hourAgo = Date.now() - (60 * 60 * 1000);
                    return logTime > hourAgo;
                  }).length}</p>
                  <p className="text-purple-100 text-xs mt-1">Recent activity</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Activity Table */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b-2 border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Activity Timeline</span>
              </CardTitle>
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Showing {processedLogs.length} of {totalCount.toLocaleString()} activities
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-ping"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gray-700">Loading Activity Logs</p>
                    <p className="text-sm text-gray-500">Fetching recent system activities...</p>
                  </div>
                </div>
              </div>
            ) : processedLogs.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-6 max-w-md text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900">No Activity Found</h3>
                    <p className="text-gray-500 leading-relaxed">
                      There are no activity logs to display at the moment. Activities will appear here as users interact with the system.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    className="mt-6 px-6 py-3 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Logs
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b-2 border-gray-100">
                      <TableHead 
                        className="cursor-pointer select-none font-bold hover:bg-blue-50 transition-colors py-4"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>Time</span>
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="font-bold py-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-green-600" />
                          <span>User</span>
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none font-bold hover:bg-blue-50 transition-colors py-4"
                        onClick={() => handleSort('action')}
                      >
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-purple-600" />
                          <span>Action</span>
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="font-bold py-4">
                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-orange-600" />
                          <span>Resource</span>
                        </div>
                      </TableHead>
                      <TableHead className="font-bold py-4">Description</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none font-bold hover:bg-blue-50 transition-colors py-4"
                        onClick={() => handleSort('severity')}
                      >
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span>Severity</span>
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedLogs.map((log: any, index) => (
                      <React.Fragment key={log.id}>
                        <TableRow 
                          className={`hover:bg-blue-50 transition-all duration-300 group cursor-pointer border-l-4 border-transparent hover:border-blue-400 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                          onClick={() => toggleRowExpansion(log.id)}
                        >
                        <TableCell className="font-mono text-xs py-4">
                          <div className="flex flex-col space-y-2">
                            <span className="font-semibold text-gray-900 bg-blue-100 px-3 py-1 rounded-lg text-xs">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                            <span className="font-semibold text-gray-900">
                              {log.actorUsername || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            {getActionIcon(log.displayAction)}
                            <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg text-sm">
                              {log.displayAction.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            {getResourceIcon(log.resource_type)}
                            <span className="text-gray-900 font-medium">{log.resourceDisplay}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <span className="text-gray-700">
                            {log.description || 'No description available'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <Badge 
                            variant={getSeverityVariant(log.severity)}
                            className="flex items-center space-x-2 px-3 py-2 font-semibold shadow-sm"
                          >
                            {getSeverityIcon(log.severity)}
                            <span className="capitalize">{log.severity}</span>
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-100 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(log.id);
                            }}
                          >
                            {expandedRows.has(log.id) ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {expandedRows.has(log.id) && (
                        <TableRow className="bg-blue-50/30 border-l-4 border-blue-400">
                          <TableCell colSpan={7} className="py-6 px-8">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-900">Activity Details</h4>
                                  <div className="text-xs space-y-1">
                                    <div><span className="font-medium">ID:</span> {log.id}</div>
                                    <div><span className="font-medium">User ID:</span> {log.user_id || 'System'}</div>
                                    <div><span className="font-medium">Resource ID:</span> {log.resource_id || 'N/A'}</div>
                                    <div><span className="font-medium">Correlation ID:</span> {log.correlation_id || 'N/A'}</div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-900">Timestamps</h4>
                                  <div className="text-xs space-y-1">
                                    <div><span className="font-medium">Activity Time:</span> {new Date(log.timestamp).toLocaleString()}</div>
                                    <div><span className="font-medium">Created At:</span> {new Date(log.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                {log.tags && log.tags.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-900">Tags</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {log.tags.map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-900">Additional Details</h4>
                                  <div className="bg-gray-100 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                      {JSON.stringify(maskSensitiveData(log.details), null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>

                {/* Enhanced Pagination */}
                <div className="flex items-center justify-between px-8 py-6 border-t-2 border-gray-100 bg-gray-50">
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <span className="font-medium">Show</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-20 h-9 border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="font-medium">entries</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="hover:bg-blue-50 border-blue-200"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="hover:bg-blue-50 border-blue-200"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1 px-4 py-2 bg-blue-100 rounded-xl border border-blue-300 shadow-sm">
                      <span className="text-sm font-bold text-blue-900">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="hover:bg-blue-50 border-blue-200"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="hover:bg-blue-50 border-blue-200"
                    >
                      Last
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600 font-medium">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} results
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Manual Activity Dialog */}
      <ManualActivityDialog 
        open={showActivityDialog}
        onOpenChange={(open) => {
          setShowActivityDialog(open);
          if (!open) {
            // Refresh logs after adding new activity
            handleRefresh();
          }
        }}
      />
    </div>
  );
}
