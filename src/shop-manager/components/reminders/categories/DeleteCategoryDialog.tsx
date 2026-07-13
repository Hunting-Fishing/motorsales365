
import { useState } from "react";
import { ReminderCategory } from "@/types/reminder";
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

interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: ReminderCategory | null;
  onDelete: () => void;
}

export function DeleteCategoryDialog({ isOpen, onClose, category, onDelete }: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const handleDelete = async () => {
    if (!category?.id) return;
    
    setIsDeleting(true);
    try {
      // Check if category is used in any reminders
      const { data: reminders, error: checkError } = await supabase
        .from("service_reminders")
        .select("id")
        .eq("category_id", category.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (reminders && reminders.length > 0) {
        // Category is in use, just update is_active to false
        const { error: updateError } = await supabase
          .from("reminder_categories")
          .update({ is_active: false })
          .eq("id", category.id);
        
        if (updateError) throw updateError;
        
        toast({
          title: "Category Deactivated",
          description: "This category is in use by reminders. It has been deactivated instead of deleted.",
        });
      } else {
        // Category not in use, safe to delete
        const { error: deleteError } = await supabase
          .from("reminder_categories")
          .delete()
          .eq("id", category.id);
        
        if (deleteError) throw deleteError;
        
        toast({
          title: "Category Deleted",
          description: "The category has been deleted successfully.",
        });
      }
      
      onDelete();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category. Please try again.",
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
            {`This will ${category?.name ? `delete the "${category.name}" category` : "delete this category"}. This action cannot be undone. If this category is in use, it will be deactivated instead of deleted.`}
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
