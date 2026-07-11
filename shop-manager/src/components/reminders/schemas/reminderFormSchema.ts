
import { z } from "zod";
import { ReminderCategory, ReminderTemplate } from "@/types/reminder";

// Schema for creating a new reminder
export const reminderFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  notes: z.string().optional(),
  
  // Advanced properties
  priority: z.string().optional(),
  categoryId: z.string().optional(),
  assignedTo: z.string().optional(), 
  templateId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.number().optional(),
  recurrenceUnit: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  
  // This is used in the form for reference/display only
  categories: z.array(z.any()).optional(),
});

// Schema with additional validation for recurring reminders
export const reminderFormSchemaWithValidation = reminderFormSchema.refine(
  (data) => {
    // If recurring is enabled, make sure interval and unit are provided
    if (data.isRecurring) {
      return !!data.recurrenceInterval && !!data.recurrenceUnit;
    }
    return true;
  },
  {
    message: "Recurrence interval and unit are required for recurring reminders",
    path: ["recurrenceInterval"],
  }
);

// Form values type derived from schema
export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
