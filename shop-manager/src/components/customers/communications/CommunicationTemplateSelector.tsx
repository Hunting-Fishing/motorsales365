import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  type: string;
  subject?: string;
  content: string;
}

// Default templates as fallback
const DEFAULT_TEMPLATES: Template[] = [
  { id: "1", name: "Service Follow-up", type: "email", subject: "Follow-up on your recent service", content: "Dear customer,\n\nThank you for bringing your vehicle in for service recently.\n\nBest regards,\nYour Service Team" },
  { id: "2", name: "Appointment Reminder", type: "email", subject: "Reminder: Your upcoming appointment", content: "Dear customer,\n\nThis is a friendly reminder about your upcoming service appointment.\n\nBest regards,\nYour Service Team" },
  { id: "3", name: "Service Reminder", type: "text", content: "Hi! Just a reminder that your vehicle is due for service. Please call us to schedule." },
  { id: "4", name: "Thank You", type: "phone", content: "Thank you for your business. Discuss recent service work and ask if they have any questions." },
];

interface CommunicationTemplateSelectorProps {
  onTemplateSelect: (id: string, name: string, content: string, subject?: string) => void;
  type: string;
  setType: (type: any) => void;
}

export const CommunicationTemplateSelector: React.FC<CommunicationTemplateSelectorProps> = ({
  onTemplateSelect,
  type,
  setType,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        // Try email_templates table with correct columns
        const { data, error } = await supabase
          .from('email_templates')
          .select('id, name, subject, content, is_archived')
          .eq('is_archived', false);

        if (!error && data && data.length > 0) {
          setTemplates(data.map(t => ({
            id: t.id,
            name: t.name,
            type: 'email',
            subject: t.subject || undefined,
            content: t.content
          })));
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter(t => t.type === type || type === "");

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setType(template.type);
    onTemplateSelect(template.id, template.name, template.content, template.subject);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Communication Type</Label>
        <Select value={type || "_none"} onValueChange={(v) => setType(v === "_none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select a type</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="in-person">In-person</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Select Template</Label>
        <Select value={selectedTemplateId || "_none"} onValueChange={handleTemplateSelect} disabled={loading}>
          <SelectTrigger><SelectValue placeholder={loading ? "Loading..." : "Choose a template"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" disabled>Choose a template</SelectItem>
            {filteredTemplates.length === 0 ? (
              <SelectItem value="_no" disabled>No templates for selected type</SelectItem>
            ) : (
              filteredTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
