import { supabase } from "@/integrations/supabase/client";
import { CustomerCommunication } from "@/types/customer/notes";

export const getCustomerCommunications = async (customerId: string): Promise<CustomerCommunication[]> => {
  try {
    const { data, error } = await supabase
      .from("customer_communications")
      .select("*")
      .eq("customer_id", customerId)
      .order("date", { ascending: false });
    
    if (error) {
      console.error("Error fetching customer communications:", error);
      throw error;
    }
    
    // Map and cast the types properly
    return (data || []).map(item => ({
      id: item.id,
      customer_id: item.customer_id,
      date: item.date,
      type: item.type as 'email' | 'phone' | 'text' | 'in-person',
      direction: item.direction as 'incoming' | 'outgoing',
      subject: item.subject,
      content: item.content,
      staff_member_id: item.staff_member_id,
      staff_member_name: item.staff_member_name,
      status: item.status as 'completed' | 'pending' | 'failed',
      template_id: item.template_id,
      template_name: item.template_name
    }));
  } catch (error) {
    console.error("Error in getCustomerCommunications:", error);
    return [];
  }
};

export const addCustomerCommunication = async (
  communication: Omit<CustomerCommunication, 'id'>
): Promise<CustomerCommunication> => {
  try {
    const { data, error } = await supabase
      .from("customer_communications")
      .insert(communication)
      .select()
      .single();
    
    if (error) {
      console.error("Error adding customer communication:", error);
      throw error;
    }
    
    // Map and cast the response properly
    return {
      id: data.id,
      customer_id: data.customer_id,
      date: data.date,
      type: data.type as 'email' | 'phone' | 'text' | 'in-person',
      direction: data.direction as 'incoming' | 'outgoing',
      subject: data.subject,
      content: data.content,
      staff_member_id: data.staff_member_id,
      staff_member_name: data.staff_member_name,
      status: data.status as 'completed' | 'pending' | 'failed',
      template_id: data.template_id,
      template_name: data.template_name
    };
  } catch (error) {
    console.error("Error in addCustomerCommunication:", error);
    throw error;
  }
};