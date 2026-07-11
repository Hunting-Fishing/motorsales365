
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { ReminderCategory } from "@/types/reminder";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: ReminderCategory | null;
  onSave: () => void;
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function EditCategoryDialog({ isOpen, onClose, category, onSave }: EditCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      color: "#9CA3AF",
      description: "",
      is_active: true,
    },
  });
  
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        color: category.color || "#9CA3AF",
        description: category.description || "",
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    }
  }, [category, form]);
  
  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (category?.id) {
        // Update existing category
        const { error } = await supabase
          .from("reminder_categories")
          .update({
            name: values.name,
            color: values.color,
            description: values.description,
            is_active: values.is_active,
          })
          .eq("id", category.id);
        
        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from("reminder_categories")
          .insert({
            name: values.name,
            color: values.color,
            description: values.description,
            is_active: values.is_active,
          });
        
        if (error) throw error;
      }
      
      onSave();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save category. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category?.id ? "Edit" : "Create"} Reminder Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Category name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  className="w-14 h-10"
                  {...form.register("color")}
                />
                <Input
                  placeholder="Color hex code"
                  value={form.watch("color")}
                  onChange={(e) => form.setValue("color", e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Category description"
                {...form.register("description")}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={form.watch("is_active")}
                onCheckedChange={(checked) => form.setValue("is_active", checked)}
              />
            </div>
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
