
import { supabase } from "@/lib/supabase";
import { InventoryVendor, CreateInventoryVendorDto } from "@/types/inventory/vendors";
import { handleApiError } from "@/utils/errorHandling";

export async function getVendors(): Promise<InventoryVendor[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_vendors")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleApiError(error, "Failed to fetch vendors");
    return [];
  }
}

export async function getVendorById(id: string): Promise<InventoryVendor | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, `Failed to fetch vendor ${id}`);
    return null;
  }
}

export async function createVendor(vendor: CreateInventoryVendorDto): Promise<InventoryVendor | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_vendors")
      .insert(vendor)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, "Failed to create vendor");
    return null;
  }
}

export async function updateVendor(id: string, updates: Partial<InventoryVendor>): Promise<InventoryVendor | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_vendors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, `Failed to update vendor ${id}`);
    return null;
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("inventory_vendors")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    handleApiError(error, `Failed to delete vendor ${id}`);
    throw error;
  }
}
