
import { supabase } from "@/integrations/supabase/client";
import { Customer, adaptCustomerForUI } from "@/types/customer";
import { CustomerFormValues } from "@/components/customers/form/schemas/customerSchema";

export const updateCustomer = async (id: string, updates: CustomerFormValues): Promise<Customer> => {
  // Format the data for the database
  const customerData = {
    first_name: updates.first_name,
    last_name: updates.last_name,
    email: updates.email,
    phone: updates.phone,
    address: updates.address,
    city: updates.city,
    state: updates.state,
    postal_code: updates.postal_code,
    country: updates.country,
    company: updates.company,
    business_type: updates.business_type,
    business_industry: updates.business_industry,
    other_business_industry: updates.other_business_industry,
    tax_id: updates.tax_id,
    business_email: updates.business_email,
    business_phone: updates.business_phone,
    preferred_payment_method: updates.preferred_payment_method,
    auto_billing: updates.auto_billing,
    credit_terms: updates.credit_terms,
    terms_agreed: updates.terms_agreed,
    shop_id: updates.shop_id,
    tags: updates.tags,
    segments: updates.segments,
    preferred_technician_id: updates.preferred_technician_id || null,
    communication_preference: updates.communication_preference,
    referral_source: updates.referral_source,
    referral_person_id: updates.referral_person_id || null,
    other_referral_details: updates.other_referral_details,
    household_id: updates.household_id || null,
    is_fleet: updates.is_fleet,
    fleet_company: updates.fleet_company,
    fleet_manager: updates.fleet_manager,
    fleet_contact: updates.fleet_contact,
    preferred_service_type: updates.preferred_service_type,
    notes: updates.notes
  };

  const { data, error } = await supabase
    .from("customers")
    .update(customerData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Handle vehicles separately
  if (updates.vehicles && updates.vehicles.length > 0) {
    const { data: existingVehicles, error: vehiclesFetchError } = await supabase
      .from("vehicles")
      .select("id, make, model, year, vin, license_plate, color, transmission, drive_type, fuel_type, engine, body_style, country, transmission_type, gvwr")
      .eq("customer_id", id);
      
    if (vehiclesFetchError) {
      console.error("Error fetching customer vehicles:", vehiclesFetchError);
    } else {
      const existingVehiclesMap = new Map();
      existingVehicles.forEach((vehicle, index) => {
        existingVehiclesMap.set(index, vehicle);
      });
      
      for (let i = 0; i < updates.vehicles.length; i++) {
        const vehicle = updates.vehicles[i];
        const existingVehicle = existingVehiclesMap.get(i);
        
        const vehicleYear = vehicle.year ? parseInt(vehicle.year, 10) : null;
        
        if (existingVehicle) {
          await supabase
            .from("vehicles")
            .update({
              make: vehicle.make,
              model: vehicle.model,
              year: vehicleYear,
              vin: vehicle.vin,
              license_plate: vehicle.license_plate,
              color: vehicle.color,
              transmission: vehicle.transmission,
              drive_type: vehicle.drive_type,
              fuel_type: vehicle.fuel_type,
              engine: vehicle.engine,
              body_style: vehicle.body_style,
              country: vehicle.country,
              transmission_type: vehicle.transmission_type,
              gvwr: vehicle.gvwr
            })
            .eq("id", existingVehicle.id);
        } else {
          await supabase
            .from("vehicles")
            .insert({
              customer_id: id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicleYear,
              vin: vehicle.vin,
              license_plate: vehicle.license_plate,
              color: vehicle.color,
              transmission: vehicle.transmission,
              drive_type: vehicle.drive_type,
              fuel_type: vehicle.fuel_type,
              engine: vehicle.engine,
              body_style: vehicle.body_style,
              country: vehicle.country,
              transmission_type: vehicle.transmission_type,
              gvwr: vehicle.gvwr
            });
        }
      }
      
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
  }

  const { data: updatedCustomer, error: fetchError } = await supabase
    .from("customers")
    .select(`
      *,
      vehicles(*)
    `)
    .eq("id", id)
    .single();
    
  if (fetchError) {
    return adaptCustomerForUI(data as Customer);
  }

  return adaptCustomerForUI(updatedCustomer as Customer);
};
