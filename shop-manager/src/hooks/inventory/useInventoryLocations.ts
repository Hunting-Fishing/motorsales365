
import { useState } from "react";
import { 
  getInventoryLocations,
  getInventoryLocationById,
  createInventoryLocation,
  updateInventoryLocation,
  deleteInventoryLocation,
  getLocationHierarchy
} from "@/services/inventory/locationService";
import { InventoryLocation, CreateInventoryLocationDto } from "@/types/inventory/locations";
import { toast } from "@/hooks/use-toast";

export function useInventoryLocations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationHierarchy, setLocationHierarchy] = useState<InventoryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | null>(null);

  // Load all locations as a flat list
  const loadLocations = async (): Promise<InventoryLocation[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryLocations();
      setLocations(data);
      return data;
    } catch (err) {
      const errorMessage = "Failed to load inventory locations";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load locations as a hierarchical structure
  const loadLocationHierarchy = async (): Promise<InventoryLocation[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLocationHierarchy();
      setLocationHierarchy(data);
      return data;
    } catch (err) {
      const errorMessage = "Failed to load location hierarchy";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load a specific location
  const loadLocation = async (id: string): Promise<InventoryLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryLocationById(id);
      setSelectedLocation(data);
      return data;
    } catch (err) {
      const errorMessage = `Failed to load location ${id}`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new location
  const addLocation = async (location: CreateInventoryLocationDto): Promise<InventoryLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await createInventoryLocation(location);
      if (result) {
        toast({
          title: "Success",
          description: `Location ${result.name} created successfully`,
          variant: "default",
        });
        await loadLocations(); // Refresh the locations list
        await loadLocationHierarchy(); // Refresh the hierarchy
        return result;
      }
      return null;
    } catch (err) {
      const errorMessage = "Failed to create location";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing location
  const editLocation = async (id: string, updates: Partial<InventoryLocation>): Promise<InventoryLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateInventoryLocation(id, updates);
      if (result) {
        toast({
          title: "Success",
          description: `Location ${result.name} updated successfully`,
          variant: "default",
        });
        await loadLocations(); // Refresh the locations list
        await loadLocationHierarchy(); // Refresh the hierarchy
        return result;
      }
      return null;
    } catch (err) {
      const errorMessage = `Failed to update location ${id}`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a location
  const removeLocation = async (id: string, name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteInventoryLocation(id);
      toast({
        title: "Success",
        description: `Location ${name} deleted successfully`,
        variant: "default",
      });
      await loadLocations(); // Refresh the locations list
      await loadLocationHierarchy(); // Refresh the hierarchy
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || `Failed to delete location ${id}`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    locations,
    locationHierarchy,
    selectedLocation,
    loadLocations,
    loadLocationHierarchy,
    loadLocation,
    addLocation,
    editLocation,
    removeLocation,
  };
}
