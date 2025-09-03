import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ActivityLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  severity: string;
}

export default function ActivityLogsViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;
    fetch(`http://localhost:8000/functions/v1/activity-logs?limit=${itemsPerPage}&offset=${offset}`, {
      headers: {
        // If you need to pass auth, add these:
        // 'Authorization': `Bearer ${yourAccessToken}`,
        // 'apikey': `${yourApiKey}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
      });
  }, [currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Calculate pagination
  const paginatedLogs = logs.slice(indexOfFirstItem - 1, indexOfLastItem);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs
                  .filter(log => {
                    // Filter out logs where changed_fields only contains updated_at or raw_user_meta_data
                    if (log.details && Array.isArray(log.details.changed_fields)) {
                      const fields = log.details.changed_fields;
                      // If all fields are in the useless list, skip
                      const uselessFields = ['updated_at', 'raw_user_meta_data'];
                      if (fields.every(f => uselessFields.includes(f))) {
                        return false;
                      }
                    }
                    // Filter out user_roles DELETE actions
                    if (log.resource_type === 'user_roles' && log.action === 'DELETE') {
                      return false;
                    }
                    // Filter out any role change to Unknown, Authenticated, or empty string (but not user creation)
                    const userCreationFields = [
                      'id', 'aud', 'role', 'email', 'created_at', 'updated_at', 'instance_id', 'is_sso_user', 'email_change', 'is_anonymous', 'phone_change', 'recovery_token', 'raw_app_meta_data', 'confirmation_token', 'encrypted_password', 'phone_change_token', 'raw_user_meta_data', 'email_change_token_new', 'reauthentication_token', 'email_change_token_current', 'email_change_confirm_status'
                    ];
                    const isUserCreation = log.resource_type === 'users' && log.details && Array.isArray(log.details.changed_fields) && userCreationFields.every(field => log.details.changed_fields.includes(field));
                    if (
                      !isUserCreation &&
                      ((log.resource_type === 'users' && log.details && Array.isArray(log.details.changed_fields) && log.details.changed_fields.includes('role')) ||
                      (log.resource_type === 'user_roles' && log.details && log.details.new_values && typeof log.details.new_values.role !== 'undefined')) &&
                      log.details.new_values && ['unknown', 'authenticated', ''].includes(log.details.new_values.role)
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map(log => {
                    // Always resolve actorUsername for display
                    let actorUsername = log.username || '';
                    if (!actorUsername) {
                      let email = log.email;
                      if (!email && log.details) {
                        email = log.details.new_values?.email || log.details.old_values?.email || log.details.user_email;
                      }
                      if (email) {
                        actorUsername = email.split('@')[0];
                      } else if (log.user_id) {
                        actorUsername = log.user_id;
                      }
                    }
                    // Detect user creation by changed fields
                    const userCreationFields = [
                      'id', 'aud', 'role', 'email', 'created_at', 'updated_at', 'instance_id', 'is_sso_user', 'email_change', 'is_anonymous', 'phone_change', 'recovery_token', 'raw_app_meta_data', 'confirmation_token', 'encrypted_password', 'phone_change_token', 'raw_user_meta_data', 'email_change_token_new', 'reauthentication_token', 'email_change_token_current', 'email_change_confirm_status'
                    ];
                    let isUserCreation = false;
                    let createdEmail = '';
                    if (
                      log.resource_type === 'users' &&
                      log.details &&
                      Array.isArray(log.details.changed_fields) &&
                      userCreationFields.every(field => log.details.changed_fields.includes(field))
                    ) {
                      isUserCreation = true;
                      if (log.details.new_values && log.details.new_values.email) {
                        createdEmail = log.details.new_values.email;
                      }
                    }
                    // Detect role change by changed fields (users or user_roles)
                    let isRoleChange = false;
                    let newRole = '';
                    let userEmail = '';
                    if (
                      (log.resource_type === 'users' && log.details && Array.isArray(log.details.changed_fields) && log.details.changed_fields.includes('role')) ||
                      (log.resource_type === 'user_roles' && log.details && log.details.new_values && log.details.new_values.role)
                    ) {
                      isRoleChange = true;
                      newRole = log.details.new_values?.role || log.details.new_values?.role || 'unknown';
                      userEmail = log.details.user_email || log.details.new_values?.email || log.details.old_values?.email || log.email || log.details.new_values?.user_email || '';
                    }
                    // For user resource, show username of actor and email for creation
                    let resourceDisplay;
                    if (isUserCreation) {
                      // Show actor username in User column, and email in details
                      const userEmail = createdEmail || log.details?.new_values?.email || log.details?.old_values?.email || log.email || '';
                      resourceDisplay = (
                        <span>
                          <strong>User</strong> ({userEmail})
                        </span>
                      );
                    } else if (log.resource_type === 'users') {
                      const userEmail = log.details?.new_values?.email || log.details?.old_values?.email || log.email || actorUsername;
                      resourceDisplay = (
                        <span>
                          <strong>User</strong> ({userEmail})
                        </span>
                      );
                    } else if (log.resource_type === 'servers') {
                      // Device resource
                      let sn = '';
                      let deviceType = '';
                      if (log.details) {
                        if (log.details.new_values) {
                          sn = log.details.new_values.serial_number || '';
                          deviceType = log.details.new_values.device_type || log.details.new_values.type || '';
                        }
                        if (!sn && log.details.old_values) {
                          sn = log.details.old_values.serial_number || '';
                        }
                        if (!deviceType && log.details.old_values) {
                          deviceType = log.details.old_values.device_type || log.details.old_values.type || '';
                        }
                      }
                      if (!deviceType) deviceType = 'Unknown';
                      resourceDisplay = (
                        <span>
                          <strong>Device</strong> ({deviceType}, {sn || log.resource_id})
                        </span>
                      );
                    } else if (log.resource_type === 'user_roles') {
                      // For user_roles resource, show Roles (user email)
                      const userEmail = log.details?.user_email || log.details?.new_values?.email || log.details?.old_values?.email || log.email || actorUsername;
                      resourceDisplay = (
                        <span>
                          <strong>Roles</strong> ({userEmail})
                        </span>
                      );
                    } else {
                      resourceDisplay = `${log.resource_type} (${log.resource_id})`;
                    }
                    // Detect login/logout by changed fields (for cases like: ["updated_at","last_sign_in_at"])
                    let detailsContent;
                    if (
                      log.details &&
                      Array.isArray(log.details.changed_fields) &&
                      log.details.changed_fields.length === 2 &&
                      log.details.changed_fields.includes('updated_at') &&
                      log.details.changed_fields.includes('last_sign_in_at') &&
                      log.resource_type === 'users'
                    ) {
                      detailsContent = <span>Login success</span>;
                    } else if (
                      log.details &&
                      Array.isArray(log.details.changed_fields) &&
                      log.details.changed_fields.length === 3 &&
                      log.details.changed_fields.includes('updated_at') &&
                      log.details.changed_fields.includes('confirmed_at') &&
                      log.details.changed_fields.includes('email_confirmed_at')
                    ) {
                      // Get email from new_values, old_values, or log.email
                      const email = log.details.new_values?.email || log.details.old_values?.email || log.email || '';
                      detailsContent = (
                        <span>
                          Email Confirmed ({email})
                        </span>
                      );
                    } else if (
                      log.resource_type === 'users' &&
                      log.details &&
                      log.details.new_values && log.details.old_values &&
                      typeof log.details.new_values.last_sign_in_at === 'string' &&
                      typeof log.details.old_values.last_sign_in_at === 'string'
                    ) {
                      const lastSignInAtNew = new Date(log.details.new_values.last_sign_in_at).getTime();
                      const lastSignInAtOld = new Date(log.details.old_values.last_sign_in_at).getTime();
                      const updatedAtNew = log.details.new_values.updated_at ? new Date(log.details.new_values.updated_at).getTime() : null;
                      const updatedAtOld = log.details.old_values.updated_at ? new Date(log.details.old_values.updated_at).getTime() : null;
                      // If lastSignInAtNew is newer than lastSignInAtOld, treat as login
                      if (lastSignInAtNew > lastSignInAtOld) {
                        detailsContent = <span>Login success</span>;
                      } else if (updatedAtNew !== null && updatedAtOld !== null && updatedAtNew > updatedAtOld && lastSignInAtNew === lastSignInAtOld) {
                        detailsContent = <span>Logout success</span>;
                      } else {
                        detailsContent = null;
                      }
                    } else if (isUserCreation) {
                      const userEmail = createdEmail || log.details?.new_values?.email || log.details?.old_values?.email || log.email || '';
                      detailsContent = (
                        <span>
                          User Create ({userEmail})
                        </span>
                      );
                    } else if (log.resource_type === 'user_roles' && log.details && log.details.new_values && log.details.changed_fields && log.details.changed_fields.includes('role')) {
                      // For user_roles resource, show Role Change to ...
                      const newRole = log.details.new_values.role || 'unknown';
                      detailsContent = (
                        <span>
                          Role Change to <strong>{newRole}</strong>
                        </span>
                      );
                    } else {
                      detailsContent = log.details ? (
                        <div style={{ fontSize: 12 }}>
                          {log.details.changed_fields && (
                            <div><strong>Changed Fields:</strong> {log.details.changed_fields.join(', ')}</div>
                          )}
                          {log.details.old_values && (
                            <details>
                              <summary>Old Values</summary>
                              <ul>
                                {Object.entries(log.details.old_values).map(([key, value]) => (
                                  <li key={key}><strong>{key}:</strong> {String(value)}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                          {log.details.new_values && (
                            <details>
                              <summary>New Values</summary>
                              <ul>
                                {Object.entries(log.details.new_values).map(([key, value]) => (
                                  <li key={key}><strong>{key}:</strong> {String(value)}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      ) : null;
                    }
                    // Only show role changes for user_roles resource
                    if (log.resource_type === 'user_roles' && log.details && log.details.new_values && log.details.changed_fields && log.details.changed_fields.includes('role')) {
                      const userEmail = (log.details?.user_email || log.details?.new_values?.email || log.details?.old_values?.email || log.email || actorUsername).split('@')[0];
                      const newRole = log.details.new_values.role || 'unknown';
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{actorUsername}</TableCell>
                          <TableCell colSpan={2} style={{ fontWeight: 'bold' }}>
                            <span>{userEmail} Roles change to <strong>{newRole.charAt(0).toUpperCase() + newRole.slice(1)}</strong></span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Badge variant={log.severity === 'error' ? 'destructive' : 'default'}>{log.severity}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    if (isUserCreation) {
                      const displayEmail = (createdEmail || log.details?.new_values?.email || log.details?.old_values?.email || log.email || actorUsername).split('@')[0];
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{actorUsername}</TableCell>
                          <TableCell>CREATE</TableCell>
                          <TableCell><strong>User</strong> ({displayEmail})</TableCell>
                          <TableCell><span>User {displayEmail} created</span></TableCell>
                          <TableCell>
                            <Badge variant={log.severity === 'error' ? 'destructive' : 'default'}>{log.severity}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{actorUsername}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{resourceDisplay}</TableCell>
                        <TableCell>{detailsContent}</TableCell>
                        <TableCell>
                          <Badge variant={log.severity === 'error' ? 'destructive' : 'default'}>{log.severity}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            {/* Pagination UI - screenshot match */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div style={{ color: '#64748b', fontSize: 14 }}>
                {`Showing ${indexOfFirstItem} to ${indexOfLastItem} of ${totalCount} entries`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ color: '#64748b', fontSize: 14 }}>
                  Rows per page:
                  <select
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ marginLeft: 8, padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                  >
                    {[10, 20, 50, 100].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: currentPage === 1 ? '#a1a1aa' : '#334155', fontWeight: 500, fontSize: 14, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: currentPage === 1 ? '#a1a1aa' : '#334155', fontWeight: 500, fontSize: 14, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontWeight: 500, fontSize: 14, color: '#0f172a', minWidth: 90, textAlign: 'center' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: currentPage === totalPages ? '#a1a1aa' : '#334155', fontWeight: 500, fontSize: 14, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: currentPage === totalPages ? '#a1a1aa' : '#334155', fontWeight: 500, fontSize: 14, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
