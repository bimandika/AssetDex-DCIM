import { checkLogoExists } from "@/utils/fileUpload";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, KeyRound, Database, Settings } from "lucide-react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useNavigate } from 'react-router-dom';
import SettingsDialog from "./SettingsDialog";

const UserMenu = () => {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const { user, profile, userRole, signOut } = useAuth();
  const { logDataOperation } = useActivityLogger();
  const navigate = useNavigate();

  const handleLogoUpdate = () => {
    // Trigger a custom event to notify other components about logo update
    window.dispatchEvent(new CustomEvent('logoUpdated'));
    
    // Also refresh localStorage data for immediate effect
    const event = new StorageEvent('storage', {
      key: 'organization-logo-url',
      newValue: localStorage.getItem('organization-logo-url'),
      storageArea: localStorage
    });
    window.dispatchEvent(event);
  };

  const handleOpenSettings = () => {
    // Trigger the hidden settings button
    if (settingsButtonRef.current) {
      settingsButtonRef.current.click();
    }
  };

  if (!user || !profile) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'engineer':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'engineer':
        return 'Engineer';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Unknown';
    }
  };

  const handleSignOut = async (e: any) => {
    e.preventDefault();
    await logDataOperation("LOGOUT", "users", user?.id, { email: user?.email });
    await signOut();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{profile.username}</span>
            <Badge variant={getRoleBadgeVariant(userRole || '')} className="text-xs">
              {getRoleLabel(userRole || '')}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile.full_name || profile.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => {
            e.preventDefault();
            setChangePasswordOpen(true);
          }}>
            <KeyRound className="h-4 w-4 mr-2" />
            Change Password
          </DropdownMenuItem>
          
          {/* Super admin backup option - appears below change password */}
          {userRole === 'super_admin' && (
            <>
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                navigate('/backup');
              }}>
                <Database className="h-4 w-4 mr-2" />
                Backup & Restore
              </DropdownMenuItem>
              
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                handleOpenSettings();
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Organization Settings
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
          
          <ChangePasswordDialog 
            open={changePasswordOpen} 
            onOpenChange={setChangePasswordOpen} 
          />
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Hidden Settings Dialog for super_admin */}
      {userRole === 'super_admin' && (
        <SettingsDialog onLogoUpdate={handleLogoUpdate}>
          <button 
            ref={settingsButtonRef}
            style={{ display: 'none' }}
            aria-hidden="true"
          >
            Hidden Settings Trigger
          </button>
        </SettingsDialog>
      )}
    </>
  );
};

export default UserMenu;
