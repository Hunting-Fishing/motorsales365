
import { supabase } from "@/integrations/supabase/client";
import { Customer, adaptCustomerForUI } from "@/types/customer";

// Search customers
export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Error searching customers:", error);
    throw error;
  }

  return (data || []).map(customer => adaptCustomerForUI(customer));
};

// Check for potential duplicate customers
export const checkDuplicateCustomers = async (
  firstName: string, 
  lastName: string, 
  email?: string, 
  phone?: string
): Promise<Customer[]> => {
  if (!firstName || !lastName) return [];
  
  let query = supabase
    .from("customers")
    .select("*")
    .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);

  // If we have email, make the search more specific
  if (email && email.length > 0) {
    query = query.or(`email.eq.${email}`);
  }
  
  // If we have phone, make the search more specific
  if (phone && phone.length > 0) {
    const formattedPhone = phone.replace(/\D/g, ''); // Strip non-digits
    if (formattedPhone.length >= 7) {
      query = query.or(`phone.like.%${formattedPhone.slice(-7)}%`); // Match last 7 digits
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error checking for duplicate customers:", error);
    throw error;
  }

  return (data || []).map(customer => adaptCustomerForUI(customer));
};

// Get customers with their vehicles
export const getCustomersWithVehicles = async (): Promise<Customer[]> => {
  try {
    // First get all customers
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("last_name", { ascending: true });
      
    if (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
    
    const customers = (data || []).map(customer => adaptCustomerForUI(customer));
    
    // For each customer, get their vehicles
    const customersWithVehicles = await Promise.all(
      customers.map(async (customer) => {
        try {
          // Fetch vehicles for this customer
          const { data: vehiclesData, error: vehiclesError } = await supabase
            .from("vehicles")
            .select("*")
            .eq("customer_id", customer.id);
            
          if (vehiclesError) {
            console.error(`Error fetching vehicles for customer ${customer.id}:`, vehiclesError);
            return { ...customer, vehicles: [] };
          }
          
          return { ...customer, vehicles: vehiclesData || [] };
        } catch (error) {
          console.error(`Error fetching vehicles for customer ${customer.id}:`, error);
          return { ...customer, vehicles: [] };
        }
      })
    );
    
    return customersWithVehicles;
  } catch (error) {
    console.error("Error fetching customers with vehicles:", error);
    throw error;
  }
};
