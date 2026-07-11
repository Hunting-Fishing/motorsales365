
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Copy } from "lucide-react";
import { ReminderTemplate } from "@/types/reminder";
import { getReminderTemplates } from "@/services/reminders/reminderQueries";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { EditTemplateDialog } from "./EditTemplateDialog";
import { DeleteTemplateDialog } from "./DeleteTemplateDialog";

export function ReminderTemplatesList() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);
  
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReminderTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load reminder templates:", err);
      setError("Failed to load reminder templates. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reminder templates."
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const handleEdit = (template: ReminderTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (template: ReminderTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDuplicate = (template: ReminderTemplate) => {
    setSelectedTemplate({
      ...template,
      id: '',
      title: `Copy of ${template.title}`,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleTemplateUpdated = () => {
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    loadTemplates();
    toast({
      title: "Success",
      description: "Template saved successfully."
    });
  };
  
  const handleTemplateDeleted = () => {
    setIsDeleteDialogOpen(false);
    setSelectedTemplate(null);
    loadTemplates();
    toast({
      title: "Success",
      description: "Template deleted successfully."
    });
  };
  
  if (loading) {
    return <div className="flex justify-center py-8">Loading templates...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md my-4">
        {error}
        <Button variant="outline" onClick={loadTemplates} className="mt-2 ml-2">
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
          <CardTitle className="text-lg">Reminder Templates</CardTitle>
          <Button onClick={() => handleEdit({
            id: '',
            title: '',
            priority: 'medium',
            defaultDaysUntilDue: 30,
            notificationDaysBefore: 3,
            isRecurring: false,
            createdBy: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {templates.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              No templates found. Create your first template to get started.
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.title}</span>
                    {template.isRecurring && (
                      <Badge variant="secondary" className="ml-2">
                        Recurring
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`ml-1 ${
                        template.priority === 'high' || template.priority === 'urgent'
                          ? 'border-red-500 text-red-500'
                          : template.priority === 'medium'
                          ? 'border-amber-500 text-amber-500'
                          : 'border-blue-500 text-blue-500'
                      }`}
                    >
                      {template.priority}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleDuplicate(template)}>
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Duplicate</span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(template)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-slate-500">
                  <span>Due in {template.defaultDaysUntilDue} days</span>
                  <span>Notify {template.notificationDaysBefore} days before</span>
                  {template.isRecurring && template.recurrenceInterval && template.recurrenceUnit && (
                    <span>Repeats every {template.recurrenceInterval} {template.recurrenceUnit}</span>
                  )}
                  {template.category && (
                    <span className="flex items-center">
                      <div
                        className="h-2 w-2 rounded-full mr-1"
                        style={{ backgroundColor: template.category.color }}
                      ></div>
                      {template.category.name}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      <EditTemplateDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateUpdated}
      />
      
      <DeleteTemplateDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        template={selectedTemplate}
        onDelete={handleTemplateDeleted}
      />
    </>
  );
}
