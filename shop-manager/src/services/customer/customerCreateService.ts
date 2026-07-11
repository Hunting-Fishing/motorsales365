
import { supabase } from '@/integrations/supabase/client';
import { Customer, CustomerCreate } from '@/types/customer';
import { CustomerVehicle } from '@/types/customer/vehicle';

// Utility function to extract actual values from wrapped objects
const extractValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle the wrapped object structure {_type: "undefined", value: "undefined"}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const extractedValue = value.value;
    return extractedValue === 'undefined' || extractedValue === undefined || extractedValue === null ? '' : String(extractedValue);
  }
  
  // Handle direct values
  return value === 'undefined' || value === undefined || value === null ? '' : String(value);
};

// Utility function for UUID fields - returns null for empty values
const extractUuidValue = (value: any): string | null => {
  const extractedValue = extractValue(value);
  return extractedValue === '' ? null : extractedValue;
};

export async function createCustomer(
  customerData: Partial<CustomerCreate>,
  vehicles: CustomerVehicle[] = []
): Promise<Customer | null> {
  console.log('Creating customer with data:', customerData);
  console.log('Creating vehicles:', vehicles);

  try {
    // Ensure required fields are present
    if (!customerData.first_name || !customerData.last_name) {
      throw new Error('First name and last name are required');
    }

    // Prepare customer data for database insertion with proper value extraction
    const dbCustomerData = {
      first_name: extractValue(customerData.first_name),
      last_name: extractValue(customerData.last_name),
      email: extractValue(customerData.email),
      phone: extractValue(customerData.phone),
      address: extractValue(customerData.address),
      city: extractValue(customerData.city),
      state: extractValue(customerData.state),
      postal_code: extractValue(customerData.postal_code),
      country: extractValue(customerData.country),
      company: extractValue(customerData.company),
      business_type: extractValue(customerData.business_type),
      business_industry: extractValue(customerData.business_industry),
      other_business_industry: extractValue(customerData.other_business_industry),
      tax_id: extractValue(customerData.tax_id),
      business_email: extractValue(customerData.business_email),
      business_phone: extractValue(customerData.business_phone),
      preferred_payment_method: extractValue(customerData.preferred_payment_method),
      auto_billing: customerData.auto_billing || false,
      credit_terms: extractValue(customerData.credit_terms),
      terms_agreed: customerData.terms_agreed || false,
      is_fleet: customerData.is_fleet || false,
      fleet_company: extractValue(customerData.fleet_company),
      fleet_manager: extractValue(customerData.fleet_manager),
      fleet_contact: extractValue(customerData.fleet_contact),
      preferred_service_type: extractValue(customerData.preferred_service_type),
      notes: extractValue(customerData.notes),
      shop_id: extractValue(customerData.shop_id),
      preferred_technician_id: extractUuidValue(customerData.preferred_technician_id),
      communication_preference: extractValue(customerData.communication_preference),
      referral_source: extractValue(customerData.referral_source),
      referral_person_id: extractUuidValue(customerData.referral_person_id),
      other_referral_details: extractValue(customerData.other_referral_details),
      household_id: extractUuidValue(customerData.household_id),
      tags: customerData.tags || [],
      segments: customerData.segments || []
    };

    // Create the customer first
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(dbCustomerData)
      .select()
      .single();

    if (customerError) {
      console.error('Error creating customer:', customerError);
      throw new Error(`Failed to create customer: ${customerError.message}`);
    }

    console.log('Customer created successfully:', customer);

    // Create vehicles if any
    if (vehicles.length > 0) {
      const vehiclesWithCustomerId = vehicles.map(vehicle => ({
        customer_id: customer.id,
        year: typeof vehicle.year === 'string' ? parseInt(vehicle.year) || 0 : vehicle.year || 0,
        make: extractValue(vehicle.make),
        model: extractValue(vehicle.model),
        vin: extractValue(vehicle.vin),
        license_plate: extractValue(vehicle.license_plate),
        trim: extractValue(vehicle.trim),
        transmission: extractValue(vehicle.transmission),
        transmission_type: extractValue(vehicle.transmission_type),
        drive_type: extractValue(vehicle.drive_type),
        fuel_type: extractValue(vehicle.fuel_type),
        engine: extractValue(vehicle.engine),
        body_style: extractValue(vehicle.body_style),
        country: extractValue(vehicle.country),
        gvwr: extractValue(vehicle.gvwr),
        color: extractValue(vehicle.color),
        last_service_date: extractValue(vehicle.last_service_date),
        notes: extractValue(vehicle.notes)
      }));

      const { error: vehiclesError } = await supabase
        .from('vehicles')
        .insert(vehiclesWithCustomerId);

      if (vehiclesError) {
        console.error('Error creating vehicles:', vehiclesError);
        // Don't fail the whole operation, just log the error
        console.warn('Customer created but vehicles failed to create');
      } else {
        console.log('Vehicles created successfully');
      }
    }

    return customer;

  } catch (error) {
    console.error('Exception in createCustomer:', error);
    throw error;
  }
}
