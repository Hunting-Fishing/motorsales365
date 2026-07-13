
import { useState } from "react";
import { 
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor 
} from "@/services/inventory/vendorService";
import { InventoryVendor, CreateInventoryVendorDto } from "@/types/inventory/vendors";
import { toast } from "@/hooks/use-toast";

export function useInventoryVendors() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<InventoryVendor | null>(null);

  // Load all vendors
  const loadVendors = async (): Promise<InventoryVendor[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVendors();
      setVendors(data);
      return data;
    } catch (err) {
      const errorMessage = "Failed to load vendors";
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

  // Load a specific vendor
  const loadVendor = async (id: string): Promise<InventoryVendor | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorById(id);
      setSelectedVendor(data);
      return data;
    } catch (err) {
      const errorMessage = `Failed to load vendor ${id}`;
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

  // Create a new vendor
  const addVendor = async (vendor: CreateInventoryVendorDto): Promise<InventoryVendor | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await createVendor(vendor);
      if (result) {
        toast({
          title: "Success",
          description: `Vendor ${result.name} created successfully`,
          variant: "default",
        });
        await loadVendors(); // Refresh the vendors list
        return result;
      }
      return null;
    } catch (err) {
      const errorMessage = "Failed to create vendor";
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

  // Update an existing vendor
  const editVendor = async (id: string, updates: Partial<InventoryVendor>): Promise<InventoryVendor | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateVendor(id, updates);
      if (result) {
        toast({
          title: "Success",
          description: `Vendor ${result.name} updated successfully`,
          variant: "default",
        });
        await loadVendors(); // Refresh the vendors list
        return result;
      }
      return null;
    } catch (err) {
      const errorMessage = `Failed to update vendor ${id}`;
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

  // Delete a vendor
  const removeVendor = async (id: string, name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteVendor(id);
      toast({
        title: "Success",
        description: `Vendor ${name} deleted successfully`,
        variant: "default",
      });
      await loadVendors(); // Refresh the vendors list
      return true;
    } catch (err) {
      const errorMessage = `Failed to delete vendor ${id}`;
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
    vendors,
    selectedVendor,
    loadVendors,
    loadVendor,
    addVendor,
    editVendor,
    removeVendor,
  };
}
