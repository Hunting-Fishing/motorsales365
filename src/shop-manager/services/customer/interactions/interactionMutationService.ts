
import { supabase } from "@/integrations/supabase/client";
import { CustomerInteraction, InteractionType, InteractionStatus } from "@/types/interaction";

export const addCustomerInteraction = async (
  interaction: Omit<CustomerInteraction, 'id'>
): Promise<CustomerInteraction | null> => {
  try {
    const { data, error } = await supabase
      .from("customer_interactions")
      .insert({
        ...interaction,
        type: interaction.type,
        status: interaction.status
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      ...data,
      type: data.type as InteractionType,
      status: data.status as InteractionStatus
    } as CustomerInteraction;
  } catch (error) {
    return null;
  }
};

export const updateCustomerInteraction = async (
  id: string,
  updates: Partial<CustomerInteraction>
): Promise<CustomerInteraction | null> => {
  try {
    const { data, error } = await supabase
      .from("customer_interactions")
      .update({
        ...updates,
        type: updates.type as InteractionType,
        status: updates.status as InteractionStatus
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      ...data,
      type: data.type as InteractionType,
      status: data.status as InteractionStatus
    } as CustomerInteraction;
  } catch (error) {
    return null;
  }
};

export const deleteCustomerInteraction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("customer_interactions")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const completeFollowUp = async (id: string): Promise<CustomerInteraction | null> => {
  try {
    const { data, error } = await supabase
      .from("customer_interactions")
      .update({
        follow_up_completed: true,
        status: "completed" as InteractionStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      ...data,
      type: data.type as InteractionType,
      status: data.status as InteractionStatus
    } as CustomerInteraction;
  } catch (error) {
    return null;
  }
};
