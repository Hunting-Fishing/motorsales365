import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_data: any;
  created_at: string;
}

interface ProjectTemplateSelectorProps {
  onSelect: (templateData: any) => void;
  onClose?: () => void;
}

export const ProjectTemplateSelector = ({ onSelect, onClose }: ProjectTemplateSelectorProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">No templates saved yet</p>
        <p className="text-sm text-muted-foreground">
          Create a project and save it as a template to reuse its structure.
        </p>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(template.template_data)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">{template.name}</h4>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {template.template_data?.project_type || 'Standard'}
                    </Badge>
                    <Badge variant="secondary">
                      {template.template_data?.phases?.length || 0} phases
                    </Badge>
                    {template.template_data?.contingency_percent && (
                      <Badge variant="secondary">
                        {template.template_data.contingency_percent}% contingency
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(template.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(template.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {onClose && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
