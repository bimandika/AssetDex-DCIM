import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface ServerRecord {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  location: string;
  rack: string;
  unit: string;
  ipOOB: string;
  ipOS: string;
  tenant: string;
  os: string;
  status: "Active" | "Maintenance" | "Offline" | "Decommissioned";
  warranty: string;
  notes: string;
}

interface EditServerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerRecord | null;
  onSave: (server: ServerRecord) => void;
}

const EditServerDialog = ({ isOpen, onClose, server, onSave }: EditServerDialogProps) => {
  const [editedServer, setEditedServer] = useState<ServerRecord | null>(null);
  const { toast } = useToast();
  const { logDataOperation } = useActivityLogger();

  useEffect(() => {
    if (server) {
      setEditedServer({ ...server });
    }
  }, [server]);

  const handleSave = () => {
    if (!editedServer || !editedServer.serialNumber || !editedServer.brand) {
      toast({
        title: "Error",
        description: "Serial Number and Brand are required fields",
        variant: "destructive"
      });
      return;
    }

    if (editedServer && server) {
      logDataOperation('update', 'server', editedServer.id, { oldValues: server, newValues: editedServer });
    }

    onSave(editedServer);
    onClose();
    
    toast({
      title: "Success",
      description: "Server updated successfully"
    });
  };

  const handleCancel = () => {
    setEditedServer(null);
    onClose();
  };

  if (!editedServer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Server</DialogTitle>
          <DialogDescription>
            Update the server details below
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number *</Label>
            <Input
              id="serialNumber"
              value={editedServer.serialNumber}
              onChange={(e) => setEditedServer({...editedServer, serialNumber: e.target.value})}
              placeholder="Enter serial number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <Select value={editedServer.brand} onValueChange={(value) => setEditedServer({...editedServer, brand: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dell">Dell</SelectItem>
                <SelectItem value="HPE">HPE</SelectItem>
                <SelectItem value="Supermicro">Supermicro</SelectItem>
                <SelectItem value="Cisco">Cisco</SelectItem>
                <SelectItem value="IBM">IBM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={editedServer.model}
              onChange={(e) => setEditedServer({...editedServer, model: e.target.value})}
              placeholder="Enter model"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={editedServer.location} onValueChange={(value) => setEditedServer({...editedServer, location: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DC-East">DC-East</SelectItem>
                <SelectItem value="DC-West">DC-West</SelectItem>
                <SelectItem value="DC-Central">DC-Central</SelectItem>
                <SelectItem value="DC-North">DC-North</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rack">Rack</Label>
            <Input
              id="rack"
              value={editedServer.rack}
              onChange={(e) => setEditedServer({...editedServer, rack: e.target.value})}
              placeholder="e.g., A-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={editedServer.unit}
              onChange={(e) => setEditedServer({...editedServer, unit: e.target.value})}
              placeholder="e.g., U15-U16"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipOOB">IP OOB</Label>
            <Input
              id="ipOOB"
              value={editedServer.ipOOB}
              onChange={(e) => setEditedServer({...editedServer, ipOOB: e.target.value})}
              placeholder="Out-of-band IP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipOS">IP OS</Label>
            <Input
              id="ipOS"
              value={editedServer.ipOS}
              onChange={(e) => setEditedServer({...editedServer, ipOS: e.target.value})}
              placeholder="Operating system IP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant</Label>
            <Input
              id="tenant"
              value={editedServer.tenant}
              onChange={(e) => setEditedServer({...editedServer, tenant: e.target.value})}
              placeholder="Tenant/Department"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="os">Operating System</Label>
            <Input
              id="os"
              value={editedServer.os}
              onChange={(e) => setEditedServer({...editedServer, os: e.target.value})}
              placeholder="OS version"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={editedServer.status} onValueChange={(value) => setEditedServer({...editedServer, status: value as ServerRecord["status"]})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="Decommissioned">Decommissioned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty">Warranty End Date</Label>
            <Input
              id="warranty"
              type="date"
              value={editedServer.warranty}
              onChange={(e) => setEditedServer({...editedServer, warranty: e.target.value})}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editedServer.notes}
              onChange={(e) => setEditedServer({...editedServer, notes: e.target.value})}
              placeholder="Additional notes about this server"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditServerDialog;
