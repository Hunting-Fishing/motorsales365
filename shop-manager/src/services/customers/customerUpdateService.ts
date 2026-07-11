import { supabase } from "@/lib/supabase";
import { Customer, adaptCustomerForUI } from "@/types/customer";
import { CustomerFormValues } from '@/components/customers/form/schemas/customerSchema';

// Helper function to extract values from VIN-decoded objects or return string values
const extractValue = (field: any): string | null => {
  if (!field) return null;
  
  // If it's already a string, return it
  if (typeof field === 'string') {
    return field.trim() || null;
  }
  
  // If it's a VIN-decoded object with _type and value properties
  if (typeof field === 'object' && field.hasOwnProperty('value')) {
    const value = field.value;
    if (typeof value === 'string' && value.trim() && value !== 'undefined') {
      return value.trim();
    }
    return null;
  }
  
  // If it's some other object, try to convert to string
  if (typeof field === 'object') {
    const str = String(field).trim();
    return str && str !== 'undefined' && str !== '[object Object]' ? str : null;
  }
  
  // Convert other types to string
  const str = String(field).trim();
  return str && str !== 'undefined' ? str : null;
};

// Helper function to extract numeric values (like year or GVWR)
const extractNumericValue = (field: any): number | null => {
  const value = extractValue(field);
  if (!value) return null;
  
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
};

// Update a customer
export const updateCustomer = async (id: string, updates: CustomerFormValues): Promise<Customer> => {
  console.log("Updating customer with data:", updates);
  
  // Format the data for the database - include only fields that exist in the customers table
  const customerData = {
    // Personal information
    first_name: updates.first_name,
    last_name: updates.last_name,
    email: updates.email,
    phone: updates.phone,
    
    // Address information
    address: updates.address,
    city: updates.city,
    state: updates.state,
    postal_code: updates.postal_code,
    country: updates.country,
    
    // Business information
    company: updates.company,
    business_type: updates.business_type,
    business_industry: updates.business_industry,
    other_business_industry: updates.other_business_industry,
    tax_id: updates.tax_id,
    business_email: updates.business_email,
    business_phone: updates.business_phone,
    
    // Payment & Billing
    preferred_payment_method: updates.preferred_payment_method,
    auto_billing: updates.auto_billing,
    credit_terms: updates.credit_terms,
    terms_agreed: updates.terms_agreed,
    
    // Shop assignment
    shop_id: updates.shop_id,
    
    // Tags and preferences
    tags: updates.tags,
    segments: updates.segments,
    preferred_technician_id: updates.preferred_technician_id || null,
    communication_preference: updates.communication_preference,
    
    // Referral information
    referral_source: updates.referral_source,
    referral_person_id: updates.referral_person_id || null,
    other_referral_details: updates.other_referral_details,
    
    // Household information
    household_id: updates.household_id || null,
    
    // Fleet information
    is_fleet: updates.is_fleet,
    fleet_company: updates.fleet_company,
    fleet_manager: updates.fleet_manager,
    fleet_contact: updates.fleet_contact,
    preferred_service_type: updates.preferred_service_type,
    
    // Additional information
    notes: updates.notes
  };

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
  let vehiclesUpdated = 0;
  if (updates.vehicles && updates.vehicles.length > 0) {
    try {
      // First get existing vehicles
      console.log("Fetching existing vehicles for customer", id);
      const { data: existingVehicles, error: vehiclesFetchError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("customer_id", id);
        
      if (vehiclesFetchError) {
        console.error("Error fetching customer vehicles:", vehiclesFetchError);
      } else {
        console.log("Found existing vehicles:", existingVehicles);
        
        // Process each submitted vehicle
        for (let i = 0; i < updates.vehicles.length; i++) {
          const vehicle = updates.vehicles[i];
          console.log(`Processing vehicle ${i}:`, vehicle);
          
          // Extract cleaned values from potentially VIN-decoded objects
          const make = extractValue(vehicle.make);
          const model = extractValue(vehicle.model);
          const year = extractNumericValue(vehicle.year);
          const vin = extractValue(vehicle.vin);
          const licensePlate = extractValue(vehicle.license_plate);
          const color = extractValue(vehicle.color);
          const transmission = extractValue(vehicle.transmission);
          const transmissionType = extractValue(vehicle.transmission_type);
          const driveType = extractValue(vehicle.drive_type);
          const fuelType = extractValue(vehicle.fuel_type);
          const engine = extractValue(vehicle.engine);
          const bodyStyle = extractValue(vehicle.body_style);
          const country = extractValue(vehicle.country);
          const gvwr = extractNumericValue(vehicle.gvwr);
          
          console.log(`Extracted values - Make: ${make}, Model: ${model}, Year: ${year}, VIN: ${vin}`);
          
          // Skip empty vehicles
          if (!make && !model && !year && !vin && !licensePlate) {
            console.log("Skipping empty vehicle at index", i);
            continue;
          }
          
          // Find if this vehicle already exists for the customer
          const existingVehicleIndex = existingVehicles?.findIndex(v => 
            (v.id && vehicle.id && v.id === vehicle.id) || 
            (v.vin && vin && v.vin === vin) ||
            (v.make === make && 
             v.model === model &&
             v.year === year &&
             v.license_plate === licensePlate)
          );
          
          if (existingVehicleIndex >= 0 && existingVehicles) {
            // Update existing vehicle
            const existingVehicle = existingVehicles[existingVehicleIndex];
            console.log(`Updating vehicle: ${year} ${make} ${model}`, existingVehicle.id);
            
            const { error: updateError } = await supabase
              .from("vehicles")
              .update({
                make,
                model,
                year: year?.toString(),
                vin,
                license_plate: licensePlate,
                color,
                transmission,
                transmission_type: transmissionType,
                drive_type: driveType,
                fuel_type: fuelType,
                engine,
                body_style: bodyStyle,
                country,
                gvwr
              } as any)
              .eq("id", existingVehicle.id);
              
            if (updateError) {
              console.error("Error updating vehicle:", updateError);
            } else {
              vehiclesUpdated++;
              console.log("Successfully updated vehicle");
            }
          } else {
            // Insert new vehicle
            console.log(`Adding new vehicle: ${year} ${make} ${model}`);
            
            const { error: insertError } = await supabase
              .from("vehicles")
              .insert({
                make,
                model,
                year: year?.toString(),
                vin,
                license_plate: licensePlate,
                color,
                transmission,
                transmission_type: transmissionType,
                drive_type: driveType,
                fuel_type: fuelType,
                engine,
                body_style: bodyStyle,
                country,
                gvwr
              } as any);
              
            if (insertError) {
              console.error("Error adding vehicle:", insertError);
            } else {
              vehiclesUpdated++;
              console.log("Successfully added new vehicle");
            }
          }
        }
        
        // Delete vehicles that were removed in the UI
        const vehiclesToKeep = new Set();
        
        updates.vehicles.forEach(vehicle => {
          if (vehicle.id) {
            vehiclesToKeep.add(vehicle.id);
          } else {
            const make = extractValue(vehicle.make);
            const model = extractValue(vehicle.model);
            const vin = extractValue(vehicle.vin);
            const licensePlate = extractValue(vehicle.license_plate);
            
            if (make && model) {
              const key = `${make}-${model}-${vin || ""}-${licensePlate || ""}`;
              vehiclesToKeep.add(key);
            }
          }
        });
        
        for (const existingVehicle of (existingVehicles || [])) {
          let shouldKeep = false;
          
          // Check by ID first
          if (existingVehicle.id && vehiclesToKeep.has(existingVehicle.id)) {
            shouldKeep = true;
          }
          
          // Then check by make-model-vin-license combination
          const key = `${existingVehicle.make}-${existingVehicle.model}-${existingVehicle.vin || ""}-${existingVehicle.license_plate || ""}`;
          if (vehiclesToKeep.has(key)) {
            shouldKeep = true;
          }
          
          if (!shouldKeep) {
            console.log(`Deleting vehicle: ${existingVehicle.year} ${existingVehicle.make} ${existingVehicle.model}`);
            
            const { error: deleteError } = await supabase
              .from("vehicles")
              .delete()
              .eq("id", existingVehicle.id);
              
            if (deleteError) {
              console.error("Error deleting vehicle:", deleteError);
            }
          }
        }
      }
      
      console.log(`Vehicle processing completed. Updated/Added ${vehiclesUpdated} vehicles.`);
    } catch (error) {
      console.error("Error processing vehicles:", error);
    }
  }

  // Fetch the updated customer with vehicles
  const { data: updatedCustomer, error: fetchError } = await supabase
    .from("customers")
    .select(`
      *,
      vehicles(*)
    `)
    .eq("id", id)
    .single();
    
  if (fetchError) {
    console.error("Error fetching updated customer:", fetchError);
    return adaptCustomerForUI(data as Customer);
  }

  return adaptCustomerForUI(updatedCustomer as Customer);
};

// Delete a customer
export const deleteCustomer = async (id: string): Promise<void> => {
  // First delete related vehicles
  try {
    const { error: vehiclesError } = await supabase
      .from("vehicles")
      .delete()
      .eq("customer_id", id);
      
    if (vehiclesError) {
      console.error("Error deleting customer vehicles:", vehiclesError);
    }
  } catch (error) {
    console.error("Error deleting customer vehicles:", error);
  }
  
  // Delete customer notes
  try {
    const { error: notesError } = await supabase
      .from("customer_notes")
      .delete()
      .eq("customer_id", id);
      
    if (notesError) {
      console.error("Error deleting customer notes:", notesError);
    }
  } catch (error) {
    console.error("Error deleting customer notes:", error);
  }
  
  // Finally delete the customer
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};
