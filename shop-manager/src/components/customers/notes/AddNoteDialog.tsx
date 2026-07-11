
import React, { useState } from "react";
import { Customer, CustomerNote } from "@/types/customer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addCustomerNote } from "@/services/customers";

interface AddNoteDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteAdded: (note: CustomerNote) => void;
}

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({
  customer,
  open,
  onOpenChange,
  onNoteAdded,
}) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Note content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save the note to the database
      const newNote = await addCustomerNote(
        customer.id,
        content,
        category as 'service' | 'sales' | 'follow-up' | 'general',
        "Current User" // In a real app, this would be the logged-in user's name
      );
      
      // Call the callback to update the parent component's state
      onNoteAdded(newNote);
      
      toast({
        title: "Note added",
        description: "Your note has been added successfully",
      });
      
      // Close the dialog and reset form
      onOpenChange(false);
      setContent("");
      setCategory("general");
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note for {customer.first_name} {customer.last_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Note</Label>
            <Textarea
              id="content"
              placeholder="Enter your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setContent("");
              setCategory("general");
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
