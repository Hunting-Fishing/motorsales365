
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { ReminderTemplate, ReminderCategory } from "@/types/reminder";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getReminderCategories } from "@/services/reminders/reminderQueries";

interface EditTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReminderTemplate | null;
  onSave: () => void;
}

const templateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  defaultDaysUntilDue: z.number().min(1, "Must be at least 1 day").default(30),
  notificationDaysBefore: z.number().min(0, "Cannot be negative").default(3),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.number().optional(),
  recurrenceUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export function EditTemplateDialog({
  isOpen,
  onClose,
  template,
  onSave,
}: EditTemplateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const { toast } = useToast();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: undefined,
      priority: "medium",
      defaultDaysUntilDue: 30,
      notificationDaysBefore: 3,
      isRecurring: false,
      recurrenceInterval: undefined,
      recurrenceUnit: undefined,
    },
  });

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getReminderCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, []);

  // Set form values when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        title: template.title,
        description: template.description || "",
        categoryId: template.categoryId,
        priority: template.priority,
        defaultDaysUntilDue: template.defaultDaysUntilDue,
        notificationDaysBefore: template.notificationDaysBefore,
        isRecurring: template.isRecurring,
        recurrenceInterval: template.recurrenceInterval,
        recurrenceUnit: template.recurrenceUnit,
      });
    }
  }, [template, form]);
  
  // Watch for isRecurring changes to update validation
  const isRecurring = form.watch("isRecurring");
  
  useEffect(() => {
    if (isRecurring) {
      form.register("recurrenceInterval", { 
        required: "Recurrence interval is required when recurring is enabled"
      });
      form.register("recurrenceUnit", { 
        required: "Recurrence unit is required when recurring is enabled"
      });
    }
  }, [isRecurring, form]);

  const onSubmit = async (values: TemplateFormValues) => {
    // Validate recurring fields if recurring is enabled
    if (values.isRecurring) {
      if (!values.recurrenceInterval) {
        form.setError("recurrenceInterval", {
          type: "manual",
          message: "Recurrence interval is required when recurring is enabled",
        });
        return;
      }
      if (!values.recurrenceUnit) {
        form.setError("recurrenceUnit", {
          type: "manual",
          message: "Recurrence unit is required when recurring is enabled",
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const currentUser = "current-user"; // In a real app, get this from auth context
      
      const templateData = {
        title: values.title,
        description: values.description,
        category_id: values.categoryId || null,
        priority: values.priority,
        default_days_until_due: values.defaultDaysUntilDue,
        notification_days_before: values.notificationDaysBefore,
        is_recurring: values.isRecurring,
        recurrence_interval: values.isRecurring ? values.recurrenceInterval : null,
        recurrence_unit: values.isRecurring ? values.recurrenceUnit : null,
      };
      
      if (template?.id) {
        // Update existing template
        const { error } = await supabase
          .from("reminder_templates")
          .update(templateData)
          .eq("id", template.id);
        
        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from("reminder_templates")
          .insert({
            ...templateData,
            created_by: currentUser,
          });
        
        if (error) throw error;
      }
      
      onSave();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save template. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{template?.id ? "Edit" : "Create"} Reminder Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Template title"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Template description"
                {...form.register("description")}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  onValueChange={(value) => form.setValue("categoryId", value)}
                  value={form.watch("categoryId")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center">
                          <div
                            className="h-2 w-2 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  onValueChange={(value: any) => form.setValue("priority", value)}
                  value={form.watch("priority")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultDaysUntilDue">Days Until Due</Label>
                <Input
                  id="defaultDaysUntilDue"
                  type="number"
                  min="1"
                  {...form.register("defaultDaysUntilDue", { valueAsNumber: true })}
                />
                {form.formState.errors.defaultDaysUntilDue && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.defaultDaysUntilDue.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notificationDaysBefore">Notify Days Before</Label>
                <Input
                  id="notificationDaysBefore"
                  type="number"
                  min="0"
                  {...form.register("notificationDaysBefore", { valueAsNumber: true })}
                />
                {form.formState.errors.notificationDaysBefore && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.notificationDaysBefore.message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isRecurring">Recurring Reminder</Label>
              <Switch
                id="isRecurring"
                checked={form.watch("isRecurring")}
                onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
              />
            </div>
            
            {form.watch("isRecurring") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="recurrenceInterval">Recurrence Interval</Label>
                  <Input
                    id="recurrenceInterval"
                    type="number"
                    min="1"
                    placeholder="e.g., 2"
                    {...form.register("recurrenceInterval", { valueAsNumber: true })}
                  />
                  {form.formState.errors.recurrenceInterval && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.recurrenceInterval.message}
                    </p>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="recurrenceUnit">Recurrence Unit</Label>
                  <Select
                    onValueChange={(value: any) => form.setValue("recurrenceUnit", value)}
                    value={form.watch("recurrenceUnit")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.recurrenceUnit && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.recurrenceUnit.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
