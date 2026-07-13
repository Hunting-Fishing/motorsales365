
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplate } from "@/types/email";
import { useEmailTemplates } from "@/hooks/email/useEmailTemplates";
import { EmailTemplateEditor } from "@/components/email/template/EmailTemplateEditor";

export default function EmailTemplates() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const { templates, loading, createTemplate, updateTemplate, sendTestEmail } = useEmailTemplates();

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setActiveTab("editor");
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setActiveTab("editor");
  };

  const handleSaveTemplate = async (template: Partial<EmailTemplate>) => {
    if (selectedTemplate) {
      const updated = await updateTemplate(selectedTemplate.id, template);
      if (updated) {
        setSelectedTemplate(updated);
        setActiveTab("list");
      }
      return updated;
    } else {
      const created = await createTemplate(template);
      if (created) {
        setActiveTab("list");
      }
      return created;
    }
  };

  const handleSendTest = async (templateId: string, email: string) => {
    const result = await sendTestEmail(templateId, email);
    return result.success;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Button onClick={handleCreateTemplate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Template List</TabsTrigger>
          <TabsTrigger value="editor" disabled={activeTab !== "editor"}>
            {selectedTemplate ? "Edit Template" : "Create Template"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium">No templates yet</h3>
              <p className="text-muted-foreground">Create your first email template to get started</p>
              <Button onClick={handleCreateTemplate} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer"
                  onClick={() => handleEditTemplate(template)}
                >
                  <h3 className="font-medium truncate">{template.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="editor">
          <EmailTemplateEditor
            template={selectedTemplate || undefined}
            onSave={handleSaveTemplate}
            onSendTest={handleSendTest}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
