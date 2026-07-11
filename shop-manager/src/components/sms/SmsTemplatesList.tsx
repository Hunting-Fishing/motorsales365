
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash } from "lucide-react";
import { SmsTemplateDialog } from "./SmsTemplateDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  category?: string;
  created_at: string;
}

export const SmsTemplatesList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);

  // Fetch SMS templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['smsTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsTemplates'] });
      toast({
        title: "Template deleted",
        description: "The SMS template has been deleted successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleEditTemplate = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SMS Templates</CardTitle>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Template
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading templates...</div>
        ) : templates?.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            No SMS templates found. Create your first template to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {templates?.map((template) => (
              <div 
                key={template.id} 
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    <div className="mt-2">
                      <p className="text-sm whitespace-pre-wrap">{template.content}</p>
                    </div>
                    {template.category && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <SmsTemplateDialog 
        isOpen={isDialogOpen} 
        onClose={handleCloseDialog}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['smsTemplates'] })}
        template={selectedTemplate || undefined}
      />
    </Card>
  );
};
