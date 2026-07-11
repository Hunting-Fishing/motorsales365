
import type { ServiceReminder, ReminderTemplate, ReminderCategory, ReminderTag } from "@/types/reminder";

// Database types that match the actual database schema
export interface DbServiceReminder {
  id: string;
  customer_id: string;
  vehicle_id?: string;
  type: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  notification_sent: boolean;
  notification_date?: string;
  created_at: string;
  created_by: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  priority: string;
  category_id?: string;
  assigned_to?: string;
  template_id?: string;
  is_recurring: boolean;
  recurrence_interval?: number;
  recurrence_unit?: string;
  parent_reminder_id?: string;
  last_occurred_at?: string;
  next_occurrence_date?: string;
  updated_at?: string;
  customers?: {
    first_name: string;
    last_name: string;
  };
  vehicles?: {
    id: string;
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
    license_plate?: string;
  };
}

export interface DbReminderTemplate {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  priority: string;
  default_days_until_due: number;
  notification_days_before: number;
  is_recurring: boolean;
  recurrence_interval?: number;
  recurrence_unit?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbReminderCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

// Mapper functions
export function mapDbServiceReminderToType(dbReminder: DbServiceReminder): ServiceReminder {
  return {
    id: dbReminder.id,
    customerId: dbReminder.customer_id,
    vehicleId: dbReminder.vehicle_id,
    type: dbReminder.type as any,
    title: dbReminder.title,
    description: dbReminder.description,
    dueDate: dbReminder.due_date,
    status: dbReminder.status === 'sent' ? 'pending' : dbReminder.status as any,
    notificationSent: dbReminder.notification_sent,
    notificationDate: dbReminder.notification_date,
    createdAt: dbReminder.created_at,
    createdBy: dbReminder.created_by,
    completedAt: dbReminder.completed_at,
    completedBy: dbReminder.completed_by,
    notes: dbReminder.notes,
    priority: dbReminder.priority as any,
    categoryId: dbReminder.category_id,
    assignedTo: dbReminder.assigned_to,
    templateId: dbReminder.template_id,
    isRecurring: dbReminder.is_recurring,
    recurrenceInterval: dbReminder.recurrence_interval,
    recurrenceUnit: dbReminder.recurrence_unit as any,
    parentReminderId: dbReminder.parent_reminder_id,
    lastOccurredAt: dbReminder.last_occurred_at,
    nextOccurrenceDate: dbReminder.next_occurrence_date
  };
}

export function mapDbReminderTemplateToType(dbTemplate: DbReminderTemplate): ReminderTemplate {
  return {
    id: dbTemplate.id,
    title: dbTemplate.title,
    description: dbTemplate.description,
    categoryId: dbTemplate.category_id,
    priority: dbTemplate.priority as any,
    defaultDaysUntilDue: dbTemplate.default_days_until_due,
    notificationDaysBefore: dbTemplate.notification_days_before,
    isRecurring: dbTemplate.is_recurring,
    recurrenceInterval: dbTemplate.recurrence_interval,
    recurrenceUnit: dbTemplate.recurrence_unit as any,
    createdBy: dbTemplate.created_by,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at
  };
}

export function mapDbReminderCategoryToType(dbCategory: DbReminderCategory): ReminderCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    color: dbCategory.color,
    description: dbCategory.description,
    is_active: dbCategory.is_active
  };
}

export function mapCreateReminderParamsToDb(params: any): any {
  return {
    customer_id: params.customerId,
    vehicle_id: params.vehicleId,
    type: params.type,
    title: params.title,
    description: params.description,
    due_date: params.dueDate,
    notes: params.notes,
    priority: params.priority,
    category_id: params.categoryId,
    assigned_to: params.assignedTo,
    template_id: params.templateId,
    is_recurring: params.isRecurring,
    recurrence_interval: params.recurrenceInterval,
    recurrence_unit: params.recurrenceUnit
  };
}
