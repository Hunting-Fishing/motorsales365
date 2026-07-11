
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Completely removes a customer and all their associated data.
 * This includes:
 * - Vehicles
 * - Household memberships
 * - Customer notes
 * - Customer interactions
 * - Customer communications
 * - Loyalty data
 * - Any segment assignments
 */
export const deleteCustomer = async (customerId: string): Promise<boolean> => {
  try {
    console.log(`Starting deletion process for customer: ${customerId}`);
    
    // 1. Remove from household (if any)
    const { error: householdError } = await supabase
      .from("household_members")
      .delete()
      .eq("customer_id", customerId);
      
    if (householdError) {
      console.error("Error removing customer from household:", householdError);
      throw householdError;
    }

    // 2. Delete customer's vehicles
    const { error: vehiclesError } = await supabase
      .from("vehicles")
      .delete()
      .eq("customer_id", customerId);
      
    if (vehiclesError) {
      console.error("Error deleting customer vehicles:", vehiclesError);
      throw vehiclesError;
    }

    // 3. Delete customer's notes
    const { error: notesError } = await supabase
      .from("customer_notes")
      .delete()
      .eq("customer_id", customerId);
      
    if (notesError) {
      console.error("Error deleting customer notes:", notesError);
      throw notesError;
    }

    // 4. Delete customer's interactions
    const { error: interactionsError } = await supabase
      .from("customer_interactions")
      .delete()
      .eq("customer_id", customerId);
      
    if (interactionsError) {
      console.error("Error deleting customer interactions:", interactionsError);
      throw interactionsError;
    }

    // 5. Delete customer's communications
    const { error: communicationsError } = await supabase
      .from("customer_communications")
      .delete()
      .eq("customer_id", customerId);
      
    if (communicationsError) {
      console.error("Error deleting customer communications:", communicationsError);
      throw communicationsError;
    }

    // 6. Delete customer's loyalty data
    const { error: loyaltyError } = await supabase
      .from("customer_loyalty")
      .delete()
      .eq("customer_id", customerId);
      
    if (loyaltyError) {
      console.error("Error deleting customer loyalty data:", loyaltyError);
      throw loyaltyError;
    }

    // 7. Delete customer's segment assignments
    const { error: segmentAssignmentsError } = await supabase
      .from("customer_segment_assignments")
      .delete()
      .eq("customer_id", customerId);
      
    if (segmentAssignmentsError) {
      console.error("Error deleting customer segment assignments:", segmentAssignmentsError);
      throw segmentAssignmentsError;
    }

    // 8. Finally delete the customer record itself
    const { error: customerDeleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);
      
    if (customerDeleteError) {
      console.error("Error deleting customer:", customerDeleteError);
      throw customerDeleteError;
    }

    console.log(`Successfully deleted customer: ${customerId} and all related data`);
    return true;
  } catch (error: any) {
    console.error("Failed to delete customer:", error);
    return false;
  }
};

/**
 * Removes a customer from a household without deleting the customer
 */
export const removeCustomerFromHousehold = async (customerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("household_members")
      .delete()
      .eq("customer_id", customerId);
      
    if (error) {
      console.error("Error removing customer from household:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to remove customer from household:", error);
    return false;
  }
};
