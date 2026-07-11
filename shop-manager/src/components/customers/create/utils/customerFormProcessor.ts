
import { CustomerFormValues } from "@/components/customers/form/schemas/customerSchema";
import { createHousehold } from "@/services/households";
import { addHouseholdMember } from "@/services/households";
import { assignCustomerToSegments } from "@/services/segments";
import { CustomerCreate, CustomerVehicle } from "@/types/customer";

/**
 * Process household-related data from the customer form
 */
export const processHouseholdData = async (data: CustomerFormValues): Promise<string | undefined> => {
  // If creating a new household
  if (data.create_new_household && data.new_household_name) {
    try {
      const newHousehold = await createHousehold({
        name: data.new_household_name,
        address: data.address
      });
      return newHousehold.id;
    } catch (error) {
      console.error("Error creating household:", error);
      return undefined;
    }
  }
  
  // If joining an existing household
  return data.household_id || undefined;
};

/**
 * Process household membership after customer creation
 */
export const processHouseholdMembership = async (
  customerId: string,
  householdId: string,
  relationshipType: string
) => {
  return await addHouseholdMember({
    customer_id: customerId,
    household_id: householdId,
    relationship_type: relationshipType
  });
};

/**
 * Process customer segment assignments
 */
export const processSegmentAssignments = async (
  customerId: string,
  segmentIds: string[]
) => {
  if (!segmentIds.length) return;
  return await assignCustomerToSegments(customerId, segmentIds);
};

/**
 * Record technician preference
 */
export const recordTechnicianPreference = async (technicianId: string) => {
  // In a real app, you might want to track this in a separate table
  console.log("Recording technician preference:", technicianId);
  return true;
};

/**
 * Prepare customer data for creation from form values
 */
export const prepareCustomerData = (data: CustomerFormValues): CustomerCreate => {
  // Transform vehicles to match CustomerVehicle type
  const formattedVehicles = data.vehicles?.map(vehicle => ({
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year ? parseInt(vehicle.year, 10) : undefined,
    vin: vehicle.vin,
    license_plate: vehicle.license_plate
  })) || [];

  // Make sure we retain all relevant fields from the form
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    postal_code: data.postal_code || "",
    country: data.country || "",
    company: data.company || "",
    notes: data.notes || "",
    shop_id: data.shop_id,
    tags: data.tags || [],
    preferred_technician_id: data.preferred_technician_id || "",
    communication_preference: data.communication_preference || "",
    referral_source: data.referral_source || "",
    referral_person_id: data.referral_person_id || "",
    other_referral_details: data.other_referral_details || "",
    is_fleet: data.is_fleet || false,
    fleet_company: data.fleet_company || "",
    
    // Safely pass vehicles data with the right structure
    vehicles: formattedVehicles as any,
    
    segments: data.segments || [],
    
    // Set the role to "Customer" for consistency
    role: "Customer",
  };
};
