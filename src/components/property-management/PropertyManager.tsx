
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Building, Server, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServerProperty {
  id: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  required: boolean;
  visible: boolean;
  options?: string[];
}

interface PropertyManagerProps {
  properties: ServerProperty[];
  setProperties: (properties: ServerProperty[]) => void;
}

const PropertyManager = ({ properties, setProperties }: PropertyManagerProps) => {
  const [newBrand, setNewBrand] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isAddStatusOpen, setIsAddStatusOpen] = useState(false);
  const { toast } = useToast();

  const brandProperty = properties.find(p => p.key === "brand");
  const locationProperty = properties.find(p => p.key === "location");
  const statusProperty = properties.find(p => p.key === "status");

  const addOption = (propertyKey: string, newOption: string) => {
    if (!newOption.trim()) return;

    const updatedProperties = properties.map(prop => {
      if (prop.key === propertyKey) {
        const currentOptions = prop.options || [];
        if (currentOptions.includes(newOption)) {
          toast({
            title: "Error",
            description: `${newOption} already exists`,
            variant: "destructive"
          });
          return prop;
        }
        return { ...prop, options: [...currentOptions, newOption] };
      }
      return prop;
    });

    setProperties(updatedProperties);
    toast({
      title: "Success",
      description: `${newOption} added successfully`
    });
  };

  const removeOption = (propertyKey: string, optionToRemove: string) => {
    const updatedProperties = properties.map(prop => {
      if (prop.key === propertyKey) {
        const currentOptions = prop.options || [];
        return { ...prop, options: currentOptions.filter(opt => opt !== optionToRemove) };
      }
      return prop;
    });

    setProperties(updatedProperties);
    toast({
      title: "Success",
      description: `${optionToRemove} removed successfully`
    });
  };

  const handleAddBrand = () => {
    addOption("brand", newBrand);
    setNewBrand("");
    setIsAddBrandOpen(false);
  };

  const handleAddLocation = () => {
    addOption("location", newLocation);
    setNewLocation("");
    setIsAddLocationOpen(false);
  };

  const handleAddStatus = () => {
    addOption("status", newStatus);
    setNewStatus("");
    setIsAddStatusOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Manage Property Options</h3>
        <p className="text-slate-600 mb-6">Add or remove options for select-type properties</p>
      </div>

      {/* Brands Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-600" />
              <CardTitle>Server Brands</CardTitle>
            </div>
            <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Brand</DialogTitle>
                  <DialogDescription>Add a new server brand option</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand Name</Label>
                    <Input
                      id="brand"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g., Lenovo"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsAddBrandOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBrand}>Add Brand</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {brandProperty?.options?.map((brand) => (
              <div key={brand} className="flex items-center space-x-1">
                <Badge variant="outline">{brand}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption("brand", brand)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locations Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-green-600" />
              <CardTitle>Data Center Locations</CardTitle>
            </div>
            <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Location</DialogTitle>
                  <DialogDescription>Add a new data center location</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location Name</Label>
                    <Input
                      id="location"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g., DC-South"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLocation}>Add Location</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {locationProperty?.options?.map((location) => (
              <div key={location} className="flex items-center space-x-1">
                <Badge variant="outline">{location}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption("location", location)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <CardTitle>Server Status Options</CardTitle>
            </div>
            <Dialog open={isAddStatusOpen} onOpenChange={setIsAddStatusOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Status</DialogTitle>
                  <DialogDescription>Add a new server status option</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status Name</Label>
                    <Input
                      id="status"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      placeholder="e.g., Retired"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsAddStatusOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStatus}>Add Status</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusProperty?.options?.map((status) => (
              <div key={status} className="flex items-center space-x-1">
                <Badge variant="outline">{status}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption("status", status)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyManager;
