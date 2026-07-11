
import { supabase } from "@/lib/supabase";
import { mapDbServiceReminderToType, mapCreateReminderParamsToDb } from "./reminderMapper";
import type { ServiceReminder } from "@/types/reminder";

export interface CreateReminderData {
  customer_id: string;
  vehicle_id?: string;
  type: string;
  title: string;
  description: string;
  due_date: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  category_id?: string;
  assigned_to?: string;
  template_id?: string;
  is_recurring?: boolean;
  recurrence_interval?: number;
  recurrence_unit?: string;
}

export interface UpdateReminderData {
  id: string;
  status?: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  completed_at?: string;
  completed_by?: string;
}

export const createReminder = async (reminderData: CreateReminderData): Promise<ServiceReminder> => {
  try {
    const dbData = mapCreateReminderParamsToDb(reminderData);
    
    const { data, error } = await supabase
      .from('service_reminders')
      .insert({
        ...dbData,
        status: 'pending',
        notification_sent: false,
        created_by: 'current-user',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        customers (
          first_name,
          last_name
        ),
        vehicles (
          id,
          make,
          model,
          year,
          vin,
          license_plate
        )
      `)
      .single();

    if (error) throw error;
    
    return mapDbServiceReminderToType(data);
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }
};

export const updateReminder = async (updateData: UpdateReminderData): Promise<ServiceReminder> => {
  try {
    const { data, error } = await supabase
      .from('service_reminders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', updateData.id)
      .select(`
        *,
        customers (
          first_name,
          last_name
        ),
        vehicles (
          id,
          make,
          model,
          year,
          vin,
          license_plate
        )
      `)
      .single();

    if (error) throw error;
    
    return mapDbServiceReminderToType(data);
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw error;
  }
};

export const completeReminder = async (reminderId: string, notes?: string): Promise<ServiceReminder> => {
  try {
    const { data, error } = await supabase
      .from('service_reminders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: 'current-user',
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select(`
        *,
        customers (
          first_name,
          last_name
        ),
        vehicles (
          id,
          make,
          model,
          year,
          vin,
          license_plate
        )
      `)
      .single();

    if (error) throw error;
    
    return mapDbServiceReminderToType(data);
  } catch (error) {
    console.error("Error completing reminder:", error);
    throw error;
  }
};

export const deleteReminder = async (reminderId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('service_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw error;
  }
};

export const bulkUpdateReminders = async (reminderIds: string[], updateData: Partial<UpdateReminderData>): Promise<ServiceReminder[]> => {
  try {
    const { data, error } = await supabase
      .from('service_reminders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .in('id', reminderIds)
      .select(`
        *,
        customers (
          first_name,
          last_name
        ),
        vehicles (
          id,
          make,
          model,
          year,
          vin,
          license_plate
        )
      `);

    if (error) throw error;
    
    return data.map(reminder => mapDbServiceReminderToType(reminder));
  } catch (error) {
    console.error("Error bulk updating reminders:", error);
    throw error;
  }
};

// Add the missing createReminderTag function
export const createReminderTag = async (tagName: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('reminder_tags')
      .insert({
        name: tagName,
        color: '#3B82F6', // Default blue color
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating reminder tag:", error);
    throw error;
  }
};
