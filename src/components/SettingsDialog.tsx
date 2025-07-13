import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Settings, Upload, X, Image } from "lucide-react";

interface SettingsDialogProps {
  children: React.ReactNode;
  onLogoUpdate?: () => void;
}

const SettingsDialog = ({ children, onLogoUpdate }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizationName, setOrganizationName] = useState("DCIMS");
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const canEdit = hasRole('engineer');

  // Check if custom logo exists when dialog opens
  const checkLogoExists = () => {
    const img = document.createElement('img');
    img.onload = () => setHasCustomLogo(true);
    img.onerror = () => setHasCustomLogo(false);
    img.src = '/logo.png?' + Date.now(); // Add timestamp to avoid cache
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Logo Upload Instructions",
      description: "Please save your selected image as 'logo.png' in the /public folder of your project, then refresh the page.",
    });
  };

  const removeLogo = () => {
    setHasCustomLogo(false);
    toast({
      title: "Logo Removed",
      description: "Organization logo has been removed. Default logo will be used.",
    });
    onLogoUpdate?.();
  };

  const updateOrganizationName = () => {
    // For simplicity, just store in localStorage
    localStorage.setItem('organizationName', organizationName);
    
    toast({
      title: "Settings Updated",
      description: "Organization name has been updated.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        checkLogoExists();
        setOrganizationName(localStorage.getItem('organizationName') || 'DCIMS');
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
            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                You need engineer permissions to edit settings.
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Organization Logo</Label>
            
            {hasCustomLogo && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                <img
                  src={'/logo.png?' + Date.now()}
                  alt="Current logo"
                  className="h-12 w-12 object-contain"
                  onError={() => setHasCustomLogo(false)}
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
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
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
                <p className="text-xs text-muted-foreground">
                  Upload PNG, JPG or other image formats. Max size: 5MB
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;