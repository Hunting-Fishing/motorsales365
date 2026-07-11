
import { supabase } from "@/integrations/supabase/client";

/**
 * Create a new household
 */
export const createHousehold = async ({ name, address }: { name: string; address?: string }) => {
  const { data, error } = await supabase
    .from('households')
    .insert({
      name,
      address
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating household:", error);
    throw error;
  }

  return data;
};

/**
 * Add a member to a household
 */
export const addHouseholdMember = async ({ 
  customer_id, 
  household_id, 
  relationship_type 
}: { 
  customer_id: string; 
  household_id: string; 
  relationship_type: string;
}) => {
  const { data, error } = await supabase
    .from('household_members')
    .insert({
      customer_id,
      household_id,
      relationship_type
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding household member:", error);
    throw error;
  }

  return data;
};
