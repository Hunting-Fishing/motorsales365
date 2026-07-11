
import { supabase } from "@/lib/supabase";
import { InventoryLocation, CreateInventoryLocationDto } from "@/types/inventory/locations";
import { handleApiError } from "@/utils/errorHandling";

export async function getInventoryLocations(): Promise<InventoryLocation[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_locations")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleApiError(error, "Failed to fetch inventory locations");
    return [];
  }
}

export async function getInventoryLocationById(id: string): Promise<InventoryLocation | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_locations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, `Failed to fetch inventory location ${id}`);
    return null;
  }
}

export async function createInventoryLocation(
  location: CreateInventoryLocationDto
): Promise<InventoryLocation | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_locations")
      .insert(location)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, "Failed to create inventory location");
    return null;
  }
}

export async function updateInventoryLocation(
  id: string, 
  updates: Partial<InventoryLocation>
): Promise<InventoryLocation | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_locations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, `Failed to update inventory location ${id}`);
    return null;
  }
}

export async function deleteInventoryLocation(id: string): Promise<void> {
  try {
    // Check if there are any child locations
    const { data: childLocations, error: checkError } = await supabase
      .from("inventory_locations")
      .select("id")
      .eq("parent_id", id);
      
    if (checkError) throw checkError;
    
    if (childLocations && childLocations.length > 0) {
      throw new Error("Cannot delete location with child locations");
    }
    
    // Check if there are any inventory items using this location
    const { data: items, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("location", id)
      .limit(1);
      
    if (itemsError) throw itemsError;
    
    if (items && items.length > 0) {
      throw new Error("Cannot delete location that has inventory items");
    }
    
    // Delete the location
    const { error } = await supabase
      .from("inventory_locations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    handleApiError(error, `Failed to delete inventory location ${id}`);
    throw error;
  }
}

export async function getLocationHierarchy(): Promise<InventoryLocation[]> {
  try {
    // Get all locations
    const { data, error } = await supabase
      .from("inventory_locations")
      .select("*")
      .order("name");
      
    if (error) throw error;
    
    // Build hierarchy
    const locationMap: Record<string, InventoryLocation> = {};
    const rootLocations: InventoryLocation[] = [];
    
    // First pass: create map of all locations
    (data || []).forEach(location => {
      locationMap[location.id] = {
        ...location,
        children: []
      };
    });
    
    // Second pass: build hierarchy
    (data || []).forEach(location => {
      if (location.parent_id && locationMap[location.parent_id]) {
        // This is a child location
        if (!locationMap[location.parent_id].children) {
          locationMap[location.parent_id].children = [];
        }
        locationMap[location.parent_id].children!.push(locationMap[location.id]);
      } else {
        // This is a root location
        rootLocations.push(locationMap[location.id]);
      }
    });
    
    return rootLocations;
  } catch (error) {
    handleApiError(error, "Failed to fetch location hierarchy");
    return [];
  }
}
