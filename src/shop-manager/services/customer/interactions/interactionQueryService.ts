
import { supabase } from "@/integrations/supabase/client";
import { CustomerInteraction, InteractionType, InteractionStatus } from "@/types/interaction";

export const getCustomerInteractions = async (customerId: string): Promise<CustomerInteraction[]> => {
  try {
    const { data, error } = await supabase
      .from("customer_interactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("date", { ascending: false });
    
    if (error) {
      throw error;
    }
    
    const interactions = (data || []).map(interaction => ({
      ...interaction,
      type: interaction.type as InteractionType,
      status: interaction.status as InteractionStatus
    })) as CustomerInteraction[];
    
    return interactions;
  } catch (error) {
    return [];
  }
};

export const getVehicleInteractions = async (vehicleId: string): Promise<CustomerInteraction[]> => {
  try {
    const { data: workOrders, error: workOrderError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('vehicle_id', vehicleId);
      
    if (workOrderError) {
      throw workOrderError;
    }
    
    const workOrderIds = workOrders?.map(wo => wo.id) || [];
    
    if (workOrderIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabase
      .from("customer_interactions")
      .select("*")
      .in("related_work_order_id", workOrderIds)
      .order("date", { ascending: false });
    
    if (error) {
      throw error;
    }
    
    const interactions: CustomerInteraction[] = (data || []).map(item => ({
      id: item.id,
      customer_id: item.customer_id,
      customer_name: item.customer_name,
      date: item.date,
      type: item.type as InteractionType,
      description: item.description,
      staff_member_id: item.staff_member_id,
      staff_member_name: item.staff_member_name,
      status: item.status as InteractionStatus,
      notes: item.notes,
      related_work_order_id: item.related_work_order_id,
      follow_up_date: item.follow_up_date,
      follow_up_completed: item.follow_up_completed,
      created_at: item.created_at,
      updated_at: item.updated_at,
      vehicle_id: vehicleId
    }));
    
    return interactions;
  } catch (error) {
    return [];
  }
};

export const getPendingFollowUps = async (): Promise<CustomerInteraction[]> => {
  try {
    const { data, error } = await supabase
      .from("customer_interactions")
      .select("*")
      .eq("type", "follow_up")
      .eq("follow_up_completed", false)
      .not("follow_up_date", "is", null)
      .order("follow_up_date", { ascending: true });
    
    if (error) {
      throw error;
    }
    
    const interactions = (data || []).map(interaction => ({
      ...interaction,
      type: interaction.type as InteractionType,
      status: interaction.status as InteractionStatus
    })) as CustomerInteraction[];
    
    return interactions;
  } catch (error) {
    return [];
  }
};
