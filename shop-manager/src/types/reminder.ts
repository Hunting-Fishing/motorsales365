
import { Customer } from "./customer";

export type ReminderStatus = "pending" | "sent" | "completed" | "cancelled";
export type ReminderType = "service" | "maintenance" | "follow_up" | "warranty" | "other";
export type ReminderPriority = "low" | "medium" | "high" | "urgent";
export type RecurrenceUnit = "days" | "weeks" | "months" | "years";

export interface ReminderCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface ReminderTag {
  id: string;
  name: string;
  color?: string;
}

export interface ServiceReminder {
  id: string;
  customerId: string;
  vehicleId?: string;
  type: ReminderType;
  title: string;
  description: string;
  dueDate: string;
  status: ReminderStatus;
  notificationSent: boolean;
  notificationDate?: string;
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  
  // New advanced properties
  priority: ReminderPriority;
  categoryId?: string;
  category?: ReminderCategory;
  assignedTo?: string;
  assignedToName?: string;
  templateId?: string;
  isRecurring: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  parentReminderId?: string;
  lastOccurredAt?: string;
  nextOccurrenceDate?: string;
  tags?: ReminderTag[];
}

export interface ReminderWithDetails extends ServiceReminder {
  customer?: Customer;
  vehicle?: {
    id: string;
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
    license_plate?: string;
  };
}

export interface ReminderTemplate {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  category?: ReminderCategory;
  priority: ReminderPriority;
  defaultDaysUntilDue: number;
  notificationDaysBefore: number;
  isRecurring: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderParams {
  customerId: string;
  vehicleId?: string;
  type: ReminderType;
  title: string;
  description: string;
  dueDate: string;
  notes?: string;
  
  // New advanced properties
  priority?: ReminderPriority;
  categoryId?: string;
  assignedTo?: string;
  templateId?: string;
  isRecurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  tagIds?: string[];
}

export interface CreateReminderTemplateParams {
  title: string;
  description?: string;
  categoryId?: string;
  priority?: ReminderPriority;
  defaultDaysUntilDue?: number;
  notificationDaysBefore?: number;
  isRecurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
}
