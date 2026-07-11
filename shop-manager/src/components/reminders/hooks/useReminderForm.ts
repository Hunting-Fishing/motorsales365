
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { createReminder, CreateReminderData } from "@/services/reminders/reminderMutations";
import { ReminderType, ReminderPriority, RecurrenceUnit, ReminderCategory } from "@/types/reminder";
import { reminderFormSchema, ReminderFormValues } from "../schemas/reminderFormSchema";

interface UseReminderFormProps {
  customerId?: string;
  vehicleId?: string;
  onSuccess?: () => void;
  categories?: ReminderCategory[];
}

export function useReminderForm({ customerId, vehicleId, onSuccess, categories = [] }: UseReminderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with default values
  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      customerId: customerId || "",
      vehicleId: vehicleId || "",
      type: "service",
      title: "",
      description: "",
      notes: "",
      priority: "medium",
      isRecurring: false,
      tagIds: [],
      categories,
    },
  });

  const onSubmit = async (values: ReminderFormValues) => {
    // Validate recurring fields if recurring is enabled
    if (values.isRecurring && (!values.recurrenceInterval || !values.recurrenceUnit)) {
      toast({
        title: "Validation Error",
        description: "Recurrence interval and unit are required for recurring reminders.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formattedDate = format(values.dueDate, "yyyy-MM-dd");
      
      const reminderData: CreateReminderData = {
        customer_id: values.customerId,
        vehicle_id: values.vehicleId,
        type: values.type,
        title: values.title,
        description: values.description || "",
        due_date: formattedDate,
        notes: values.notes,
        priority: values.priority as 'low' | 'medium' | 'high',
        category_id: values.categoryId,
        assigned_to: values.assignedTo,
      };
      
      await createReminder(reminderData);
      
      toast({
        title: "Reminder Created",
        description: "The service reminder has been created successfully."
      });
      
      // Reset the form
      form.reset();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      toast({
        title: "Error",
        description: "Failed to create service reminder.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    onSubmit
  };
}
