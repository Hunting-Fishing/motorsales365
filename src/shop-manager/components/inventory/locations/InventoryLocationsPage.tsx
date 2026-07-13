
import React, { useEffect, useState } from "react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash, Edit, ChevronRight, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryLocations } from "@/hooks/inventory/useInventoryLocations";
import { InventoryLocation } from "@/types/inventory/locations";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function InventoryLocationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    type: "warehouse" as const,
    description: "",
    parent_id: undefined as string | undefined
  });
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  
  const {
    locationHierarchy,
    loadLocationHierarchy,
    addLocation,
    removeLocation
  } = useInventoryLocations();

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      await loadLocationHierarchy();
    } catch (error) {
      console.error("Error loading inventory locations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory locations"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addLocation({
        name: newLocation.name.trim(),
        type: newLocation.type,
        description: newLocation.description,
        parent_id: newLocation.parent_id === 'none' ? null : newLocation.parent_id,
      });
      
      setNewLocation({
        name: "",
        type: "warehouse",
        description: "",
        parent_id: undefined
      });
      
      setShowAddDialog(false);
      
      toast({
        variant: "default",
        title: "Success",
        description: "Location added successfully"
      });
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to add location"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async (location: InventoryLocation) => {
    if (location.children && location.children.length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete location with child locations"
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
      setIsSubmitting(true);
      try {
        await removeLocation(location.id, location.name);
      } catch (error) {
        console.error("Error deleting location:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete location"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleExpand = (locationId: string) => {
    if (expandedNodes.includes(locationId)) {
      setExpandedNodes(expandedNodes.filter(id => id !== locationId));
    } else {
      setExpandedNodes([...expandedNodes, locationId]);
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'warehouse': return 'Warehouse';
      case 'section': return 'Section';
      case 'shelf': return 'Shelf';
      case 'bin': return 'Bin';
      default: return type;
    }
  };

  const renderLocationRow = (location: InventoryLocation, level = 0) => {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expandedNodes.includes(location.id);
    
    return (
      <React.Fragment key={location.id}>
        <TableRow className="hover:bg-slate-50">
          <TableCell className="font-medium">
            <div className="flex items-center">
              <div style={{ width: `${level * 20}px` }} />
              {hasChildren && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-6 w-6 mr-1"
                  onClick={() => toggleExpand(location.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              {!hasChildren && <div className="w-6 mr-1" />}
              {location.name}
            </div>
          </TableCell>
          <TableCell>{getLocationTypeLabel(location.type || "")}</TableCell>
          <TableCell>{location.description || "-"}</TableCell>
          <TableCell className="text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteLocation(location)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        
        {isExpanded && location.children && location.children.map(child => 
          renderLocationRow(child, level + 1)
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="container mx-auto">
      <Card className="bg-white shadow-md rounded-xl border border-gray-100">
        <CardHeader>
          <CardTitle className="text-2xl">Inventory Locations</CardTitle>
          <CardDescription>
            Manage the locations for your inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              onClick={() => setShowAddDialog(true)} 
              className="rounded-full bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-medium">Location Name</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Description</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationHierarchy.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-[200px] text-center">
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                          <div className="text-lg font-medium text-slate-700">No locations found</div>
                          <p className="text-slate-500 max-w-md text-center">
                            Add your first location to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    locationHierarchy.map(location => renderLocationRow(location))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Create a new inventory location or sub-location
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select 
                value={newLocation.type} 
                onValueChange={(value) => setNewLocation({...newLocation, type: value as any})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="shelf">Shelf</SelectItem>
                  <SelectItem value="bin">Bin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parent" className="text-right">
                Parent Location
              </Label>
              <Select 
                value={newLocation.parent_id} 
                onValueChange={(value) => setNewLocation({...newLocation, parent_id: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select parent location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {locationHierarchy.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} (Warehouse)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={newLocation.description}
                onChange={(e) => setNewLocation({...newLocation, description: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLocation} 
              disabled={!newLocation.name.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
