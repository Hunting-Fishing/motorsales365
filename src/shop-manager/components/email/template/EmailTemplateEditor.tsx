import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { SafeHTML } from "@/components/ui/SafeHTML";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmailTemplate, EmailCategory, EmailTemplateVariable } from "@/types/email";
import { Plus, X, Save, Send } from "lucide-react";

const emailCategoryOptions: { value: EmailCategory; label: string }[] = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'survey', label: 'Survey' },
  { value: 'custom', label: 'Custom' },
];

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Email subject is required"),
  description: z.string().optional(),
  category: z.enum(['transactional', 'marketing', 'reminder', 'welcome', 'follow_up', 'survey', 'custom']),
  content: z.string().min(1, "Email content is required"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  onSave: (template: Partial<EmailTemplate>) => Promise<EmailTemplate | null>;
  onSendTest?: (templateId: string, email: string) => Promise<boolean>;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template,
  onSave,
  onSendTest
}) => {
  const [activeTab, setActiveTab] = useState("editor");
  const [variables, setVariables] = useState<EmailTemplateVariable[]>([]);
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableDefault, setNewVariableDefault] = useState('');
  const [newVariableDescription, setNewVariableDescription] = useState('');
  const [previewEmail, setPreviewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name || '',
      subject: template?.subject || '',
      description: template?.description || '',
      category: template?.category || 'marketing',
      content: template?.content || '<p>Hello {{name}},</p><p>Your content here.</p><p>Regards,<br>Your Company</p>',
    },
  });
  
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        description: template.description || '',
        category: template.category,
        content: template.content,
      });
      
      if (template.variables) {
        setVariables(template.variables);
      }
    }
  }, [template]);

  const handleAddVariable = () => {
    if (!newVariableName) return;
    
    const newVariable: EmailTemplateVariable = {
      id: Date.now().toString(),
      name: newVariableName,
      default_value: newVariableDefault,
      description: newVariableDescription
    };
    
    setVariables([...variables, newVariable]);
    setNewVariableName('');
    setNewVariableDefault('');
    setNewVariableDescription('');
  };

  const removeVariable = (index: number) => {
    const newVariables = [...variables];
    newVariables.splice(index, 1);
    setVariables(newVariables);
  };

  const insertVariableToContent = (variableName: string) => {
    const content = form.getValues('content');
    const updatedContent = content + `{{${variableName}}}`;
    form.setValue('content', updatedContent);
  };

  const handleSubmit = async (data: TemplateFormValues) => {
    setSaving(true);
    try {
      await onSave({
        ...data,
        variables,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!template?.id || !previewEmail) return;
    
    setSending(true);
    try {
      if (onSendTest) {
        await onSendTest(template.id, previewEmail);
      }
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    let previewContent = form.getValues('content');
    
    variables.forEach((variable) => {
      const regex = new RegExp(`{{${variable.name}}}`, 'g');
      previewContent = previewContent.replace(regex, variable.default_value || `[${variable.name}]`);
    });
    
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Subject:</h3>
          <p>{form.getValues('subject')}</p>
        </div>
        
        <div className="border p-4 rounded-md bg-white">
          <SafeHTML html={previewContent} />
        </div>
        
        {template?.id && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Send Test Email</h3>
            <div className="flex gap-2">
              <Input
                placeholder="recipient@example.com"
                value={previewEmail}
                onChange={(e) => setPreviewEmail(e.target.value)}
              />
              <Button 
                onClick={handleSendTest} 
                disabled={sending || !previewEmail}
              >
                {sending ? "Sending..." : "Send Test"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{template ? 'Edit Email Template' : 'Create Email Template'}</CardTitle>
            <CardDescription>
              Design your email template with dynamic content and variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emailCategoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome to our service!" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of this template's purpose"
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Template Content</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <TabsContent value="editor" className="mt-0 p-0">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Insert Variable:</span>
                        {variables.map((variable, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => insertVariableToContent(variable.name)}
                          >
                            {variable.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={15}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Use HTML for formatting. Insert variables using &#123;&#123;variableName&#125;&#125; syntax.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            <TabsContent value="variables" className="mt-0 p-0">
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Template Variables</h3>
                  {variables.length > 0 ? (
                    <div className="border rounded-md divide-y">
                      {variables.map((variable, index) => (
                        <div key={index} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">&#123;&#123;{variable.name}&#125;&#125;</p>
                            <p className="text-sm text-muted-foreground">{variable.description}</p>
                            <div className="text-sm text-muted-foreground mb-2">
                              Default: {variable.default_value || 'None'}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeVariable(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No variables added yet</p>
                  )}
                </div>
                
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-sm font-medium">Add New Variable</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="varName">Variable Name</Label>
                      <Input
                        id="varName"
                        placeholder="name"
                        value={newVariableName}
                        onChange={(e) => setNewVariableName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="varDefault">Default Value</Label>
                      <Input
                        id="varDefault"
                        placeholder="John"
                        value={newVariableDefault}
                        onChange={(e) => setNewVariableDefault(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="varDesc">Description</Label>
                      <Input
                        id="varDesc"
                        placeholder="Recipient's first name"
                        value={newVariableDescription}
                        onChange={(e) => setNewVariableDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddVariable} 
                    disabled={!newVariableName}
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variable
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="mt-0 p-0">
              {renderPreview()}
            </TabsContent>
          </CardContent>
          
          <div className="flex justify-end px-6 pb-6">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </form>
    </Form>
  );
};
