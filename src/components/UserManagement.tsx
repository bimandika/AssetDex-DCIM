import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Users, Shield, Edit, Search, UserPlus, AlertCircle, Mail, Trash2, Loader2, Eye, EyeOff, Key, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';

interface UserProfile extends Tables<"profiles"> {
  user_roles: {
    role: Enums<"user_role">;
  }[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<Enums<"user_role"> | "">("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Enums<"user_role"> | "">("");
  const [addingUser, setAddingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const roles: { value: Enums<"user_role">; label: string; description: string }[] = [
    { value: "viewer", label: "Viewer", description: "Can only view data" },
    { value: "engineer", label: "Engineer", description: "Can view and edit servers and properties" },
    { value: "super_admin", label: "Super Admin", description: "Full access including user management" }
  ];

  useUrlState('userMgmt_page', page, setPage);
  useUrlState('userMgmt_filters', filters, setFilters);
  useUrlState('userMgmt_search', searchTerm, setSearchTerm);
  useAutoSave({ editingUser, newUserEmail, newUserRole }, 'userManagement_form');
  useRestoreForm('userManagement_form', (data) => {
    if (data.editingUser) setEditingUser(data.editingUser);
    if (data.newUserEmail) setNewUserEmail(data.newUserEmail);
    if (data.newUserRole) setNewUserRole(data.newUserRole);
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Fetch user roles separately
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        user_roles: userRoles?.filter(role => role.user_id === profile.id) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newUserRole: Enums<"user_role">) => {
    try {
      // Update the user's role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newUserRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully"
      });

      // Refresh the users list
      fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setNewRole("");
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUserId || !newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsResetting(true);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error or no active session:', sessionError);
        throw new Error(sessionError?.message || 'No active session. Please log in again.');
      }
      
      // Get the base URL from the Supabase client configuration
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
      // Construct the function URL for the dedicated password reset endpoint
      const functionUrl = `${supabaseUrl}/functions/v1/admin-reset-password`;
      
      console.log('Calling password reset function:', { functionUrl, userId: resettingUserId });
      
      // Call the admin-reset-password Edge Function
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: resettingUserId,
          newPassword: newPassword
        })
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Error response from server:', { 
          status: response.status,
          statusText: response.statusText,
          responseData 
        });
        
        throw new Error(
          responseData.error?.message || 
          responseData.message || 
          `Failed to reset password (Status: ${response.status})`
        );
      }

      // Show success message
      toast({
        title: "Success",
        description: "Password has been reset successfully"
      });
      
      // Reset form and close dialog
      setNewPassword("");
      setResettingUserId(null);
    } catch (error) {
      console.error("Error in handleResetPassword:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      // Get the base URL from the Supabase client configuration
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
      
      // Call the admin-delete-user Edge Function
      const response = await fetch(`${baseUrl}/functions/v1/admin-delete-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: userToDelete.id  // Changed from user_id to userId to match Edge Function expectation
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      toast({
        title: "Success",
        description: "User has been deleted successfully"
      });
      
      // Refresh the users list
      fetchUsers();
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserRole) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingUser(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      // Get the base URL from the Supabase client configuration
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
      
      // Generate a more secure random password
      const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(byte => (byte % 36).toString(36))
        .join('') + 'A1!'; // Ensure it has at least one uppercase and one special character
      
      console.log(`Temporary password for ${newUserEmail}: ${randomPassword}`);
      
      // Call the admin-create-user Edge Function
      const response = await fetch(`${baseUrl}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: randomPassword,
          fullName: newUserEmail.split('@')[0],
          role: newUserRole
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user');
      }

      // Show success message with temporary password (only visible to admin)
      const handleCopyPassword = () => {
        navigator.clipboard.writeText(randomPassword);
        toast({
          title: "Copied!",
          description: "Password copied to clipboard",
          duration: 2000
        });
      };

      toast({
        title: "User Created Successfully",
        description: (
          <div className="space-y-2">
            <p>User account created for {newUserEmail}</p>
            <div className="bg-yellow-50 p-2 rounded-md text-sm text-yellow-800 border border-yellow-200">
              <div className="flex justify-between items-center mb-1">
                <p className="font-medium">Temporary Password:</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-6 px-2 text-yellow-700 hover:bg-yellow-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPassword();
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="flex items-center justify-between bg-yellow-100 px-3 py-2 rounded font-mono text-sm mb-2">
                <span className="select-all">{randomPassword}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPassword();
                  }}
                  className="ml-2 text-yellow-600 hover:text-yellow-800"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-yellow-700">Please provide this password to the user securely.</p>
              <p className="text-xs text-yellow-700">They will be prompted to change it on first login.</p>
            </div>
          </div>
        ),
        duration: 10000, // Show for 10 seconds
        className: "[&>div]:w-full" // Make toast take full width
      });
      
      // Reset form and refresh user list
      setNewUserEmail("");
      setNewUserRole("");
      setIsAddUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive"
      });
    } finally {
      setAddingUser(false);
    }
  };

  const getRoleBadgeColor = (role: Enums<"user_role">) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-700 hover:bg-red-100";
      case "engineer":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "viewer":
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const badgeProps: BadgeProps = {
      variant: "outline",
      className: isActive 
        ? "bg-green-50 text-green-700 border-green-200" 
        : "bg-amber-50 text-amber-700 border-amber-200"
    };

    return isActive ? (
      <Badge {...badgeProps}>
        <Check className="h-3 w-3 mr-1" /> Active
      </Badge>
    ) : (
      <Badge {...badgeProps}>
        <X className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: boolean) => {
    try {
      setUpdatingStatus(userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User has been ${newStatus ? 'approved' : 'rejected'} successfully`,
      });

      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_roles[0]?.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.status ? 'active' : 'inactive').includes(searchTerm.toLowerCase())
  );

  const roleStats = users.reduce((acc, user) => {
    const role = user.user_roles[0]?.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Invite a new user to the system and assign them a role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={(value: Enums<"user_role">) => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-slate-500">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newUserRole === "super_admin" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">Warning</p>
                        <p className="text-yellow-700">
                          Super Admins have full access to the system including user management.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">How it works:</p>
                    <p>After creating the user, you'll need to provide them with the temporary password shown in the success message.</p>
                    <p className="mt-1 text-xs">The user will be prompted to change their password on first login.</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddUserDialogOpen(false);
                      setNewUserEmail("");
                      setNewUserRole("");
                    }}
                    disabled={addingUser}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={!newUserEmail || !newUserRole || addingUser}
                  >
                    {addingUser ? "Adding..." : "Add User"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin Only
          </Badge>

          {/* Reset Password Dialog */}
          <Dialog open={!!resettingUserId} onOpenChange={(open) => !open && setResettingUserId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset User Password</DialogTitle>
                <DialogDescription>
                  Set a new password for this user. They will need to use this password to log in.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters. Include uppercase, lowercase, and numbers.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResettingUserId(null);
                      setNewPassword("");
                    }}
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={!newPassword || newPassword.length < 8 || isResetting}
                  >
                    {isResetting ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-slate-600">Super Admins</p>
                <p className="text-2xl font-bold text-red-600">{roleStats.super_admin || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Engineers</p>
                <p className="text-2xl font-bold text-blue-600">{roleStats.engineer || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-slate-600">Viewers</p>
                <p className="text-2xl font-bold text-gray-600">{roleStats.viewer || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Search by username, name, or role</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user roles and permissions. Click the edit button to change a user's role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {user.username}
                        {user.status === false && (
                          <span className="ml-2 text-xs text-amber-600">(Pending)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.full_name || "—"}</TableCell>
                    <TableCell>
                      {getStatusBadge(user.status !== false)}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.user_roles[0]?.role)}`}>
                        {user.user_roles[0]?.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResettingUserId(user.id);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(user);
                            setNewRole(user.user_roles[0]?.role || '');
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit Role"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.status === false ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateUserStatus(user.id, true)}
                              title="Approve User"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={updatingStatus === user.id}
                            >
                              {updatingStatus === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="Reject User"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="Delete User"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.username || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select 
                value={newRole} 
                onValueChange={(value: Enums<"user_role">) => setNewRole(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-slate-500">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRole === "super_admin" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Warning</p>
                    <p className="text-yellow-700">
                      Super Admins have full access to the system including user management.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                  setNewRole("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newRole && editingUser) {
                    handleRoleChange(editingUser.id, newRole);
                  }
                }}
                disabled={!newRole || (editingUser && newRole === editingUser.user_roles[0]?.role)}
              >
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.username}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;