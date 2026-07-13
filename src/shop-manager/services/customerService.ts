import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerCreate, adaptCustomerForUI } from "@/types/customer";
import { getCustomerLoyalty } from "./loyalty/customerLoyaltyService";
import { CustomerFormValues } from '@/components/customers/form/schemas/customerSchema';
import { importCustomersFromCSV } from "./customers/customerImportService";

// Export CustomerCreate type
export type { CustomerCreate };

// Re-export importCustomersFromCSV
export { importCustomersFromCSV };

// Fetch all customers
export const getAllCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }

  // Adapt each customer for UI components
  const customers = (data || []).map(customer => adaptCustomerForUI(customer));
  
  // Fetch loyalty data for each customer
  // This is done separately to keep the initial customer query simple
  try {
    for (const customer of customers) {
      try {
        const loyalty = await getCustomerLoyalty(customer.id);
        if (loyalty) {
          customer.loyalty = loyalty;
        }
      } catch (error) {
        console.error(`Error fetching loyalty for customer ${customer.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error fetching customer loyalty data:", error);
  }

  return customers;
};

// Fetch a customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching customer:", error);
    throw error;
  }

  if (!data) return null;
  
  const customer = adaptCustomerForUI(data);
  
  // Fetch loyalty data
  try {
    const loyalty = await getCustomerLoyalty(customer.id);
    if (loyalty) {
      customer.loyalty = loyalty;
    }
  } catch (error) {
    console.error(`Error fetching loyalty for customer ${customer.id}:`, error);
  }

  return customer;
};

// Update a customer
export const updateCustomer = async (id: string, updates: CustomerFormValues): Promise<Customer> => {
  // Format the data for the database - only include fields that exist in the customers table
  const customerData = {
    // Personal information - these fields exist in the customers table
    first_name: updates.first_name,
    last_name: updates.last_name,
    email: updates.email,
    phone: updates.phone,
    
    // Address information - only include address field
    address: updates.address,
    
    // Business information
    shop_id: updates.shop_id,
    
    // Tags and preferences
    preferred_technician_id: updates.preferred_technician_id,
    
    // Referral information
    referral_person_id: updates.referral_person_id,
    
    // Household information
    household_id: updates.household_id,
    
    // Fleet information
    is_fleet: updates.is_fleet,
    fleet_company: updates.fleet_company,
  };

  console.log("Updating customer with data:", customerData);

  const { data, error } = await supabase
    .from("customers")
    .update(customerData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer:", error);
    throw error;
  }

  // If the customer has vehicles, handle those separately
  if (updates.vehicles && updates.vehicles.length > 0) {
    try {
      // First get existing vehicles
      const { data: existingVehicles, error: vehiclesFetchError } = await supabase
        .from("vehicles")
        .select("id, make, model, year, vin, license_plate")
        .eq("customer_id", id);
        
      if (vehiclesFetchError) {
        console.error("Error fetching customer vehicles:", vehiclesFetchError);
      } else {
        // Create a map of existing vehicles for quick lookup
        const existingVehiclesMap = new Map();
        existingVehicles.forEach((vehicle, index) => {
          existingVehiclesMap.set(index, vehicle);
        });
        
        // Process each submitted vehicle
        for (let i = 0; i < updates.vehicles.length; i++) {
          const vehicle = updates.vehicles[i];
          const existingVehicle = existingVehiclesMap.get(i);
          
          // Convert year from string to number
          const vehicleYear = vehicle.year ? parseInt(vehicle.year, 10) : null;
          
          if (existingVehicle) {
            // Update existing vehicle
            await supabase
              .from("vehicles")
              .update({
                make: vehicle.make,
                model: vehicle.model,
                year: vehicleYear,
                vin: vehicle.vin,
                license_plate: vehicle.license_plate
              })
              .eq("id", existingVehicle.id);
          } else {
            // Insert new vehicle
            await supabase
              .from("vehicles")
              .insert({
                customer_id: id,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicleYear,
                vin: vehicle.vin,
                license_plate: vehicle.license_plate
              });
          }
        }
        
        // If there are more existing vehicles than submitted ones, remove the extra ones
        if (existingVehicles.length > updates.vehicles.length) {
          for (let i = updates.vehicles.length; i < existingVehicles.length; i++) {
            const vehicleToRemove = existingVehiclesMap.get(i);
            if (vehicleToRemove) {
              await supabase
                .from("vehicles")
                .delete()
                .eq("id", vehicleToRemove.id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating vehicles:", error);
      // We don't throw here to ensure the customer update still succeeds
    }
  }

  // Store additional information like city, state, etc. in separate tables or update related tables as needed
  // For now, we'll adapt the customer data for UI
  return adaptCustomerForUI(data);
};
