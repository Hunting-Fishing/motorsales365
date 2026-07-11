
import { useEffect, useState } from "react";
import { Form } from "@/components/ui/form";
import { useReminderForm } from "./hooks/useReminderForm";
import { CustomerVehicleFields } from "./form-fields/CustomerVehicleFields";
import { ReminderTypeField } from "./form-fields/ReminderTypeField";
import { ReminderDetailsFields } from "./form-fields/ReminderDetailsFields";
import { DueDateField } from "./form-fields/DueDateField";
import { FormActions } from "./form-fields/FormActions";
import { RecurrenceFields } from "./form-fields/RecurrenceFields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReminderTemplates, getReminderCategories } from "@/services/reminders/reminderQueries";
import { toast } from "@/hooks/use-toast";
import { ReminderTemplate, ReminderCategory } from "@/types/reminder";
import { Loader2 } from "lucide-react";
import { AssignmentField } from "./form-fields/AssignmentField";

interface AddReminderFormProps {
  customerId?: string;
  vehicleId?: string;
  onSuccess?: () => void;
}

export function AddReminderForm({ customerId, vehicleId, onSuccess }: AddReminderFormProps) {
  const [activeTab, setActiveTab] = useState<"custom" | "template">("custom");
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  
  const { form, isSubmitting, onSubmit } = useReminderForm({
    customerId,
    vehicleId,
    onSuccess,
    categories,
  });
  
  // Load templates and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingTemplates(true);
        const [templatesData, categoriesData] = await Promise.all([
          getReminderTemplates(),
          getReminderCategories(),
        ]);
        setTemplates(templatesData);
        setCategories(categoriesData);
        form.setValue("categories", categoriesData);
      } catch (err) {
        console.error("Failed to load form data:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load templates or categories."
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    loadData();
  }, [form]);
  
  // Apply template when one is selected
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setSelectedTemplate(template);
    
    // Apply template values to form
    form.setValue("title", template.title);
    form.setValue("description", template.description || "");
    form.setValue("categoryId", template.categoryId || "");
    form.setValue("priority", template.priority);
    form.setValue("isRecurring", template.isRecurring);
    
    if (template.isRecurring) {
      form.setValue("recurrenceInterval", template.recurrenceInterval || 1);
      form.setValue("recurrenceUnit", template.recurrenceUnit || "months");
    }
    
    form.setValue("templateId", template.id);
    
    // Set due date based on template defaultDaysUntilDue
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + template.defaultDaysUntilDue);
    form.setValue("dueDate", dueDate);
    
    // Switch to custom tab to review and edit values
    setActiveTab("custom");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CustomerVehicleFields 
          form={form} 
          customerId={customerId} 
          vehicleId={vehicleId} 
        />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "custom" | "template")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Custom Reminder</TabsTrigger>
            <TabsTrigger value="template">From Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="custom" className="space-y-6">
            <ReminderTypeField form={form} />
            <ReminderDetailsFields form={form} />
            <DueDateField form={form} />
            <RecurrenceFields form={form} />
            <AssignmentField form={form} />
          </TabsContent>
          
          <TabsContent value="template">
            {isLoadingTemplates ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No templates found.</p>
                <Button variant="secondary" onClick={() => setActiveTab("custom")}>
                  Create Custom Reminder
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{template.title}</h4>
                      <div className="flex gap-2">
                        {template.category && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: template.category.color }}
                          />
                        )}
                        <span className="text-xs bg-accent-foreground/10 px-2 py-0.5 rounded-full">
                          {template.priority}
                        </span>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                      <span>Due in {template.defaultDaysUntilDue} days</span>
                      {template.isRecurring && template.recurrenceInterval && template.recurrenceUnit && (
                        <span>Repeats every {template.recurrenceInterval} {template.recurrenceUnit}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <FormActions isSubmitting={isSubmitting} />
      </form>
    </Form>
  );
}
