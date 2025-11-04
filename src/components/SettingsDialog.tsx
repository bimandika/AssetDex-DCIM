import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processLogoUpload, checkLogoExists, getCurrentLogoUrl, saveOrganizationName, getOrganizationName, updateOrganizationNameInEnv } from "@/utils/fileUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Image, RefreshCw } from "lucide-react";

interface SettingsDialogProps {
  children: React.ReactNode;
  onLogoUpdate?: () => void;
}

const SettingsDialog = ({ children, onLogoUpdate }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [organizationName, setOrganizationName] = useState("DCIMS");
  const [savePermanently, setSavePermanently] = useState(false);
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const canEdit = hasRole('engineer') || hasRole('super_admin');

  // Check if custom logo exists when dialog opens
  const checkForLogo = async () => {
    setChecking(true);
    try {
      const exists = await checkLogoExists();
      setHasCustomLogo(exists);
    } catch (error) {
      console.error('Error checking logo:', error);
      setHasCustomLogo(false);
    } finally {
      setChecking(false);
    }
  };

  const handleRefreshLogo = async () => {
    await checkForLogo();
    
    // Force refresh all logo states across the app
    window.dispatchEvent(new CustomEvent('logoUpdated'));
    const event = new StorageEvent('storage', {
      key: 'organization-logo-url',
      newValue: localStorage.getItem('organization-logo-url'),
      storageArea: localStorage
    });
    window.dispatchEvent(event);
    
    toast({
      title: "Logo Status Updated",
      description: hasCustomLogo ? "Custom logo detected" : "No custom logo found",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const result = await processLogoUpload(file);
      
      if (result.success) {
        toast({
          title: "Logo Uploaded Successfully!",
          description: "Your logo has been saved and is now active.",
        });
        
        // Trigger immediate logo update
        onLogoUpdate?.();
        
        // Force refresh logo status immediately
        await checkForLogo();
        
        // Dispatch multiple events to ensure all components update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('logoUpdated'));
          const event = new StorageEvent('storage', {
            key: 'organization-logo-url',
            newValue: localStorage.getItem('organization-logo-url'),
            storageArea: localStorage
          });
          window.dispatchEvent(event);
        }, 100);
        
      } else {
        toast({
          title: "Upload Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    setHasCustomLogo(false);
    toast({
      title: "Logo Removed",
      description: "Organization logo has been removed. Default logo will be used.",
    });
    onLogoUpdate?.();
  };

  const updateOrganizationName = async () => {
    try {
      // Always save to localStorage first
      saveOrganizationName(organizationName);
      
      // If permanent save is requested, also save to .env file
      if (savePermanently) {
        const result = await updateOrganizationNameInEnv(organizationName);
        if (result.success) {
          toast({
            title: "Settings Saved Permanently",
            description: "Organization name has been saved to configuration file and will persist across restarts.",
          });
        } else {
          toast({
            title: "Partial Success",
            description: "Organization name updated temporarily. " + result.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Settings Updated",
          description: "Organization name has been updated temporarily.",
        });
      }
    } catch (error) {
      console.error('Error updating organization name:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update organization name. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        checkForLogo();
        setOrganizationName(getOrganizationName());
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Organization Settings</DialogTitle>
          <DialogDescription>
            Customize your organization's branding and settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <div className="flex space-x-2">
              <Input
                id="org-name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={!canEdit}
                placeholder="Organization Name"
              />
              {canEdit && (
                <Button 
                  onClick={updateOrganizationName}
                  disabled={organizationName === (localStorage.getItem('organizationName') || 'DCIMS')}
                  size="sm"
                >
                  Update
                </Button>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="save-permanently"
                  checked={savePermanently}
                  onCheckedChange={(checked) => setSavePermanently(checked as boolean)}
                />
                <Label htmlFor="save-permanently" className="text-sm text-slate-600">
                  Save permanently to configuration file (survives browser restarts)
                </Label>
              </div>
            )}
            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                You need engineer or super admin permissions to edit settings.
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Organization Logo</Label>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshLogo}
                  disabled={checking}
                  className="text-xs h-6 px-2"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Checking...' : 'Refresh'}
                </Button>
              )}
            </div>
            
            {hasCustomLogo && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                <img
                  src={getCurrentLogoUrl()}
                  alt="Current logo"
                  className="h-12 w-12 object-contain"
                  onError={(e) => {
                    // Try SVG fallback
                    const target = e.target as HTMLImageElement;
                    const storageUrl = localStorage.getItem('organization-logo-url');
                    if (storageUrl && target.src.includes(storageUrl)) {
                      // If storage URL fails, try local PNG
                      target.src = `/logo.png?t=${Date.now()}`;
                    } else if (target.src.includes('.png')) {
                      // If PNG fails, try SVG
                      target.src = `/logo.svg?t=${Date.now()}`;
                    } else {
                      // All failed, no custom logo
                      setHasCustomLogo(false);
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Current Logo</p>
                  <p className="text-xs text-muted-foreground">Click upload to replace</p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {!hasCustomLogo && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                <div className="h-12 w-12 flex items-center justify-center bg-blue-600 rounded">
                  <Image className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Default Logo</p>
                  <p className="text-xs text-muted-foreground">Upload a custom logo to replace</p>
                </div>
              </div>
            )}

            {canEdit && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : hasCustomLogo ? 'Replace Logo' : 'Upload Logo'}
                </Button>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-medium text-green-700 mb-2">✅ Recommended</div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>• Square: 256×256px</div>
                    <div>• Wide: 300×100px</div>
                    <div>• PNG with transparency</div>
                    <div>• Clean, simple design</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;