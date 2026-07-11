
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

export interface InventorySupplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  is_active: boolean;
  notes?: string;
  type?: string;
  region?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  notes?: string;
  type?: string;
  region?: string;
}

// Get all inventory suppliers with full data
export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  try {
    console.log('Fetching inventory suppliers from suppliers table...');
    
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .order("name");

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }

    console.log('Raw supplier data from database:', data);
    return data || [];
  } catch (error) {
    console.error("Error fetching inventory suppliers:", error);
    return [];
  }
}

// Get supplier names only (for backward compatibility)
export async function getSupplierNames(): Promise<string[]> {
  try {
    const suppliers = await getInventorySuppliers();
    return suppliers.map(supplier => supplier.name);
  } catch (error) {
    console.error("Error fetching supplier names:", error);
    return [];
  }
}

// Add a new supplier with full data
export async function addInventorySupplier(supplierData: CreateSupplierData): Promise<InventorySupplier> {
  try {
    if (!supplierData.name?.trim()) {
      throw new Error('Supplier name cannot be empty');
    }

    console.log('Adding supplier to database:', supplierData);
    
    // Check if supplier already exists
    const { data: existing, error: checkError } = await supabase
      .from("inventory_suppliers")
      .select("id")
      .eq("name", supplierData.name.trim())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing supplier:', checkError);
      throw checkError;
    }

    if (existing) {
      throw new Error(`Supplier "${supplierData.name}" already exists`);
    }

    // Add new supplier
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .insert({
        name: supplierData.name.trim(),
        contact_name: supplierData.contact_name?.trim() || null,
        email: supplierData.email?.trim() || null,
        phone: supplierData.phone?.trim() || null,
        address: supplierData.address?.trim() || null,
        website: supplierData.website?.trim() || null,
        payment_terms: supplierData.payment_terms?.trim() || null,
        lead_time_days: supplierData.lead_time_days || null,
        notes: supplierData.notes?.trim() || null,
        type: supplierData.type?.trim() || null,
        region: supplierData.region?.trim() || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
    
    console.log('Supplier added successfully:', data);
    toast.success(`Supplier "${supplierData.name}" has been added successfully`);
    return data;
  } catch (error) {
    console.error("Error adding supplier:", error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function addInventorySupplierByName(name: string): Promise<void> {
  await addInventorySupplier({ name });
}

// Update supplier
export async function updateInventorySupplier(id: string, supplierData: Partial<CreateSupplierData>): Promise<InventorySupplier> {
  try {
    console.log('Updating supplier:', id, supplierData);
    
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .update({
        name: supplierData.name?.trim(),
        contact_name: supplierData.contact_name?.trim() || null,
        email: supplierData.email?.trim() || null,
        phone: supplierData.phone?.trim() || null,
        address: supplierData.address?.trim() || null,
        website: supplierData.website?.trim() || null,
        payment_terms: supplierData.payment_terms?.trim() || null,
        lead_time_days: supplierData.lead_time_days || null,
        notes: supplierData.notes?.trim() || null,
        type: supplierData.type?.trim() || null,
        region: supplierData.region?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
    
    console.log('Supplier updated successfully:', data);
    toast.success(`Supplier "${data.name}" has been updated successfully`);
    return data;
  } catch (error) {
    console.error("Error updating supplier:", error);
    throw error;
  }
}

// Delete supplier from the suppliers table
export async function deleteInventorySupplier(id: string): Promise<void> {
  try {
    console.log('Removing supplier from database:', id);
    
    // Get supplier name first for toast message
    const { data: supplierData } = await supabase
      .from("inventory_suppliers")
      .select("name")
      .eq("id", id)
      .single();
    
    const { error } = await supabase
      .from("inventory_suppliers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('Error removing supplier:', error);
      throw error;
    }
    
    console.log('Supplier removed successfully');
    toast.success(`Supplier "${supplierData?.name || 'Unknown'}" has been removed`);
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
}
