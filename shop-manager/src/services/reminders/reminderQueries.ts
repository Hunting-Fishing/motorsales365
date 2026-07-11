
import { supabase } from "@/lib/supabase";
import { 
  mapDbServiceReminderToType, 
  mapDbReminderTemplateToType, 
  mapDbReminderCategoryToType 
} from "./reminderMapper";
import type { 
  ServiceReminder, 
  ReminderTemplate, 
  ReminderCategory, 
  ReminderTag 
} from "@/types/reminder";

// Define filters interface
export interface ReminderFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  assignedTo?: string;
  isRecurring?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  tagIds?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

// Get all reminders with optional filters
export const getAllReminders = async (filters: ReminderFilters = {}): Promise<ServiceReminder[]> => {
  let query = supabase
    .from('service_reminders')
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

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  
  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  
  if (filters.isRecurring !== undefined) {
    query = query.eq('is_recurring', filters.isRecurring);
  }
  
  if (filters.dateRange?.from) {
    query = query.gte('due_date', filters.dateRange.from.toISOString().split('T')[0]);
  }
  
  if (filters.dateRange?.to) {
    query = query.lte('due_date', filters.dateRange.to.toISOString().split('T')[0]);
  }

  // Apply search
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'due_date';
  const sortOrder = filters.sortOrder || 'asc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply limit
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get reminders for a specific customer
export const getCustomerReminders = async (customerId: string, filters: ReminderFilters = {}): Promise<ServiceReminder[]> => {
  let query = supabase
    .from('service_reminders')
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
    .eq('customer_id', customerId);

  // Apply additional filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order('due_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching customer reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get reminders for a specific vehicle
export const getVehicleReminders = async (vehicleId: string, filters: ReminderFilters = {}): Promise<ServiceReminder[]> => {
  let query = supabase
    .from('service_reminders')
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
    .eq('vehicle_id', vehicleId);

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order('due_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching vehicle reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get upcoming reminders (due within specified days)
export const getUpcomingReminders = async (limit: number = 10, filters: ReminderFilters = {}): Promise<ServiceReminder[]> => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  let query = supabase
    .from('service_reminders')
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
    .eq('status', 'pending')
    .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching upcoming reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get overdue reminders
export const getOverdueReminders = async (): Promise<ServiceReminder[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('service_reminders')
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
    .eq('status', 'pending')
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) {
    console.error("Error fetching overdue reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get today's reminders
export const getTodaysReminders = async (): Promise<ServiceReminder[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('service_reminders')
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
    .eq('due_date', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching today's reminders:", error);
    throw error;
  }

  return data?.map(mapDbServiceReminderToType) || [];
};

// Get reminder templates
export const getReminderTemplates = async (): Promise<ReminderTemplate[]> => {
  const { data, error } = await supabase
    .from('reminder_templates')
    .select('*')
    .order('title', { ascending: true });

  if (error) {
    console.error("Error fetching reminder templates:", error);
    throw error;
  }

  return data?.map(mapDbReminderTemplateToType) || [];
};

// Get reminder categories
export const getReminderCategories = async (): Promise<ReminderCategory[]> => {
  const { data, error } = await supabase
    .from('reminder_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching reminder categories:", error);
    throw error;
  }

  return data?.map(mapDbReminderCategoryToType) || [];
};

// Get reminder tags
export const getReminderTags = async (): Promise<ReminderTag[]> => {
  const { data, error } = await supabase
    .from('reminder_tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching reminder tags:", error);
    throw error;
  }

  return data || [];
};
