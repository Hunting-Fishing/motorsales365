
import React, { useState } from "react";
import { Customer, CustomerCommunication } from "@/types/customer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationTemplateSelector } from "./CommunicationTemplateSelector";

interface AddCommunicationDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommunicationAdded: (communication: CustomerCommunication) => void;
}

export const AddCommunicationDialog: React.FC<AddCommunicationDialogProps> = ({
  customer,
  open,
  onOpenChange,
  onCommunicationAdded,
}) => {
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<"email" | "phone" | "text" | "in-person">("email");
  const [direction, setDirection] = useState<"incoming" | "outgoing">("outgoing");
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (id: string, name: string, templateContent: string, templateSubject?: string) => {
    setTemplateId(id);
    setTemplateName(name);
    setContent(templateContent);
    if (templateSubject) {
      setSubject(templateSubject);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Communication content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, this would save to Supabase
      const newCommunication: CustomerCommunication = {
        id: uuidv4(),
        customer_id: customer.id,
        date: new Date().toISOString(),
        type,
        direction,
        subject,
        content,
        staff_member_id: "current-user-id", // In a real app, this would be the logged-in user's ID
        staff_member_name: "Current User", // In a real app, this would be the logged-in user's name
        status: "completed",
        template_id: templateId,
        template_name: templateName,
      };
      
      // Call the callback to update the parent component's state
      onCommunicationAdded(newCommunication);
      
      toast({
        title: "Communication recorded",
        description: "The communication has been recorded successfully",
      });
      
      // Close the dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error recording communication:", error);
      toast({
        title: "Error",
        description: "Failed to record communication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSubject("");
    setType("email");
    setDirection("outgoing");
    setTemplateId(undefined);
    setTemplateName(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Communication with {customer.first_name} {customer.last_name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="template">Use Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="in-person">In-person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select value={direction} onValueChange={(value: any) => setDirection(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(type === "email") && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter communication details..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="template" className="space-y-4 py-4">
            <CommunicationTemplateSelector
              onTemplateSelect={handleTemplateSelect}
              type={type}
              setType={setType}
            />
            
            {templateName && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Selected Template</Label>
                  <div className="text-sm p-2 bg-muted rounded-md">{templateName}</div>
                </div>
                
                {subject && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="template-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="template-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Communication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
