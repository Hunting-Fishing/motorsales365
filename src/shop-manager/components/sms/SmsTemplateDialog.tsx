
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SmsTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  template?: {
    id: string;
    name: string;
    content: string;
    description?: string;
    category?: string;
  };
}

export function SmsTemplateDialog({ 
  isOpen, 
  onClose, 
  onSave,
  template
}: SmsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setContent(template.content || "");
      setDescription(template.description || "");
      setCategory(template.category || "");
    } else {
      setName("");
      setContent("");
      setDescription("");
      setCategory("");
    }
  }, [template, isOpen]);

  const handleSave = async () => {
    if (!name || !content) {
      toast({
        title: "Missing fields",
        description: "Template name and content are required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      if (template?.id) {
        // Update existing template
        const { error } = await supabase
          .from("sms_templates")
          .update({ 
            name, 
            content, 
            description, 
            category 
          })
          .eq("id", template.id);

        if (error) throw error;
        toast({
          title: "Template updated",
          description: "SMS template has been updated successfully"
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from("sms_templates")
          .insert({ 
            name: name, 
            content: content, 
            description: description, 
            category: category 
          });

        if (error) throw error;
        toast({
          title: "Template created",
          description: "New SMS template has been created"
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "There was an error saving the template",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit SMS Template" : "Create SMS Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right pt-2">
              Content
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="col-span-3 min-h-[150px]"
              placeholder="Enter the SMS template content..."
            />
          </div>
          <div className="col-span-4 text-xs text-muted-foreground px-4">
            <p>Available variables: {"{firstName}"}, {"{lastName}"}, {"{appointmentDate}"}, {"{companyName}"}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
