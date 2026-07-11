
import { supabase } from "@/integrations/supabase/client";
import { Customer, adaptCustomerForUI } from "@/types/customer";

export const searchCustomers = async (query: string, limit: number = 50): Promise<Customer[]> => {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        vehicles(*)
      `)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(limit)
      .order("last_name", { ascending: true });
    
    if (error) {
      console.error("Error searching customers:", error);
      throw error;
    }
    
    if (!data) {
      return [];
    }
    
    return data.map(customer => adaptCustomerForUI(customer as Customer));
  } catch (error) {
    console.error("Error in searchCustomers:", error);
    return [];
  }
};

export const checkDuplicateCustomers = async (
  firstName: string,
  lastName: string,
  email?: string,
  phone?: string
): Promise<Customer[]> => {
  try {
    let query = supabase
      .from("customers")
      .select("*");

    // Build conditions for potential duplicates
    const conditions = [];
    
    if (firstName && lastName) {
      conditions.push(`first_name.ilike.${firstName}`);
      conditions.push(`last_name.ilike.${lastName}`);
    }
    
    if (email) {
      conditions.push(`email.ilike.${email}`);
    }
    
    if (phone) {
      conditions.push(`phone.ilike.${phone}`);
    }

    if (conditions.length === 0) {
      return [];
    }

    query = query.or(conditions.join(','));

    const { data, error } = await query;
    
    if (error) {
      console.error("Error checking for duplicate customers:", error);
      throw error;
    }
    
    return (data || []).map(customer => adaptCustomerForUI(customer as Customer));
  } catch (error) {
    console.error("Error in checkDuplicateCustomers:", error);
    return [];
  }
};

export const getCustomersWithVehicles = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        vehicles(*)
      `)
      .not("vehicles", "is", null)
      .order("last_name", { ascending: true });
    
    if (error) {
      console.error("Error fetching customers with vehicles:", error);
      throw error;
    }
    
    return (data || []).map(customer => adaptCustomerForUI(customer as Customer));
  } catch (error) {
    console.error("Error in getCustomersWithVehicles:", error);
    return [];
  }
};
