import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Trash2, Edit, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PropertyManager from "./property-management/PropertyManager";
import BulkImport from "./property-management/BulkImport";

interface ServerProperty {
  id: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  required: boolean;
  visible: boolean;
  options?: string[];
}

const defaultProperties: ServerProperty[] = [
  { id: "1", name: "Hostname", key: "hostname", type: "text", required: true, visible: true },
  { id: "2", name: "Device Type", key: "device_type", type: "select", required: true, visible: true, options: ["Server", "Storage", "Network"] },
  { id: "3", name: "DC Site", key: "dc_site", type: "text", required: true, visible: true },
  { id: "4", name: "DC Building", key: "dc_building", type: "text", required: false, visible: true },
  { id: "5", name: "DC Floor", key: "dc_floor", type: "text", required: false, visible: true },
  { id: "6", name: "DC Room", key: "dc_room", type: "text", required: false, visible: true },
  { id: "7", name: "Allocation", key: "allocation", type: "select", required: false, visible: true, options: ["IAAS/PAAS", "SAAS", "Load Balancer", "Database"] },
  { id: "8", name: "Environment", key: "environment", type: "select", required: false, visible: true, options: ["Production", "Testing", "Pre-Production", "Development"] },
  { id: "9", name: "IP Address", key: "ip_address", type: "text", required: false, visible: true },
  { id: "10", name: "Serial Number", key: "serial_number", type: "text", required: false, visible: true },
  { id: "11", name: "Manufacturer", key: "manufacturer", type: "text", required: false, visible: true },
  { id: "12", name: "Model", key: "model", type: "text", required: false, visible: true },
  { id: "13", name: "Status", key: "status", type: "select", required: false, visible: true, options: ["Active", "Inactive", "Maintenance", "Retired"] },
  { id: "14", name: "Notes", key: "notes", type: "text", required: false, visible: true }
];

const ServerProperties = () => {
  const [properties, setProperties] = useState<ServerProperty[]>(defaultProperties);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<ServerProperty | null>(null);
  const { toast } = useToast();

  const [newProperty, setNewProperty] = useState<Partial<ServerProperty>>({
    name: "",
    key: "",
    type: "text",
    required: false,
    visible: true,
    options: []
  });

  const handleToggleVisibility = (id: string) => {
    setProperties(properties.map(prop =>
      prop.id === id ? { ...prop, visible: !prop.visible } : prop
    ));
  };

  const handleToggleRequired = (id: string) => {
    setProperties(properties.map(prop =>
      prop.id === id ? { ...prop, required: !prop.required } : prop
    ));
  };

  const handleAddProperty = () => {
    if (!newProperty.name || !newProperty.key) {
      toast({
        title: "Error",
        description: "Property name and key are required",
        variant: "destructive"
      });
      return;
    }

    const property: ServerProperty = {
      id: Date.now().toString(),
      name: newProperty.name || "",
      key: newProperty.key || "",
      type: newProperty.type || "text",
      required: newProperty.required || false,
      visible: newProperty.visible || true,
      options: newProperty.options || []
    };

    setProperties([...properties, property]);
    setNewProperty({ name: "", key: "", type: "text", required: false, visible: true, options: [] });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Property added successfully"
    });
  };

  const handleDeleteProperty = (id: string) => {
    const property = properties.find(p => p.id === id);
    if (property?.required) {
      toast({
        title: "Error",
        description: "Cannot delete required properties",
        variant: "destructive"
      });
      return;
    }
    
    setProperties(properties.filter(prop => prop.id !== id));
    toast({
      title: "Success",
      description: "Property deleted successfully"
    });
  };

  const handleBulkImportComplete = (count: number) => {
    toast({
      title: "Import Complete",
      description: `Successfully imported ${count} servers`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Server Properties & Management</h2>
          <p className="text-slate-600">Customize server properties and manage data</p>
        </div>
      </div>

      <Tabs defaultValue="properties" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="manage">Manage Options</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Create a new server property to track additional information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Property Name</Label>
                    <Input
                      id="name"
                      value={newProperty.name || ""}
                      onChange={(e) => setNewProperty({...newProperty, name: e.target.value})}
                      placeholder="e.g., CPU Count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key">Property Key</Label>
                    <Input
                      id="key"
                      value={newProperty.key || ""}
                      onChange={(e) => setNewProperty({...newProperty, key: e.target.value})}
                      placeholder="e.g., cpuCount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type</Label>
                    <Select 
                      value={newProperty.type || "text"} 
                      onValueChange={(value: "text" | "number" | "date" | "boolean" | "select") => 
                        setNewProperty({...newProperty, type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="required"
                      checked={newProperty.required || false}
                      onCheckedChange={(checked) => setNewProperty({...newProperty, required: checked})}
                    />
                    <Label htmlFor="required">Required field</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddProperty}>
                    Add Property
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Configuration</CardTitle>
              <CardDescription>
                Manage which properties are visible and required for servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{property.name}</h4>
                          {property.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{property.type}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Key: {property.key}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`visible-${property.id}`} className="text-sm">Visible</Label>
                        <Switch
                          id={`visible-${property.id}`}
                          checked={property.visible}
                          onCheckedChange={() => handleToggleVisibility(property.id)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`required-${property.id}`} className="text-sm">Required</Label>
                        <Switch
                          id={`required-${property.id}`}
                          checked={property.required}
                          onCheckedChange={() => handleToggleRequired(property.id)}
                        />
                      </div>
                      {!property.required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProperty(property.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <PropertyManager properties={properties} setProperties={setProperties} />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <BulkImport onImportComplete={handleBulkImportComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServerProperties;
