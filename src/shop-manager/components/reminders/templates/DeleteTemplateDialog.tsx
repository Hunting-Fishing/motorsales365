
import { useState } from "react";
import { ReminderTemplate } from "@/types/reminder";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";

interface DeleteTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReminderTemplate | null;
  onDelete: () => void;
}

export function DeleteTemplateDialog({ 
  isOpen, 
  onClose, 
  template, 
  onDelete 
}: DeleteTemplateDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const handleDelete = async () => {
    if (!template?.id) return;
    
    setIsDeleting(true);
    try {
      // Check if template is used in any reminders
      const { data: reminders, error: checkError } = await supabase
        .from("service_reminders")
        .select("id")
        .eq("template_id", template.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (reminders && reminders.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot Delete Template",
          description: "This template is in use by existing reminders. Remove those reminders first or update them to use a different template.",
        });
        onClose();
        return;
      }
      
      const { error: deleteError } = await supabase
        .from("reminder_templates")
        .delete()
        .eq("id", template.id);
      
      if (deleteError) throw deleteError;
      
      onDelete();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {`This will ${template?.title ? `delete the "${template.title}" template` : "delete this template"}. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
