import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Edit, Trash2, Download, Eye, Copy } from "lucide-react";
import { reportTemplatesService, type ReportTemplate } from "@/lib/services/reportTemplatesService";

interface ReportTemplateBuilderProps {
  onSubmit?: () => Promise<void>;
}

export function ReportTemplateBuilder({ onSubmit }: ReportTemplateBuilderProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "custom",
    template_content: { sections: [] },
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templates = await reportTemplatesService.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error("Error loading report templates:", error);
      toast({
        title: "Error",
        description: "Failed to load report templates.",
        variant: "destructive",
      });
    }
  };

  const createDefaultTemplates = async () => {
    try {
      setLoading(true);
      await reportTemplatesService.initializeDefaultTemplates();

      toast({
        title: "Success",
        description: "Default report templates created successfully.",
      });

      loadTemplates();
    } catch (error) {
      console.error("Error creating default templates:", error);
      toast({
        title: "Error",
        description: "Failed to create default templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTemplate) {
        await reportTemplatesService.updateTemplate(editingTemplate.key, formData);
      } else {
        await reportTemplatesService.createTemplate(formData);
      }

      toast({
        title: "Success",
        description: `Report template ${editingTemplate ? "updated" : "created"} successfully.`,
      });

      setIsDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();

      if (onSubmit) {
        await onSubmit();
      }
    } catch (error) {
      console.error("Error saving report template:", error);
      toast({
        title: "Error",
        description: "Failed to save report template.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      template_type: "custom",
      template_content: { sections: [] },
      is_active: true
    });
  };

  const deleteTemplate = async (templateKey: string) => {
    if (!confirm("Are you sure you want to delete this report template?")) return;

    try {
      await reportTemplatesService.deleteTemplate(templateKey);

      toast({
        title: "Success",
        description: "Report template deleted successfully.",
      });

      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete report template.",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (template: ReportTemplate) => {
    try {
      const duplicatedTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        template_type: template.template_type,
        template_content: template.template_content,
        is_active: true
      };

      await reportTemplatesService.createTemplate(duplicatedTemplate);

      toast({
        title: "Success",
        description: "Report template duplicated successfully.",
      });

      loadTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate report template.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      template_type: template.template_type,
      template_content: template.template_content,
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'impact': return 'bg-green-500';
      case 'grant': return 'bg-blue-500';
      case 'board': return 'bg-purple-500';
      case 'financial': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Report Template Builder
            </CardTitle>
            <CardDescription>
              Create and manage report templates for various non-profit reporting needs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button variant="outline" onClick={createDefaultTemplates} disabled={loading}>
                Create Default Templates
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit" : "Create"} Report Template
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Annual Impact Report"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="template_type">Template Type</Label>
                      <Select value={formData.template_type} onValueChange={(value) => setFormData({ ...formData, template_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="impact">Impact Report</SelectItem>
                          <SelectItem value="grant">Grant Report</SelectItem>
                          <SelectItem value="board">Board Report</SelectItem>
                          <SelectItem value="financial">Financial Report</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose and use case for this template"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : editingTemplate ? "Update" : "Create"} Template
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="space-y-4">
              <p>No report templates created yet.</p>
              <Button onClick={createDefaultTemplates} disabled={loading}>
                {loading ? "Creating..." : "Create Default Templates"}
              </Button>
              <p className="text-sm">Or create your own custom template using the "Add Template" button.</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="templates" className="space-y-4">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="templates">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.key}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge className={getTemplateTypeColor(template.template_type)}>
                          {template.template_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        System Template
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => duplicateTemplate(template)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(template)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" title="Generate Report">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteTemplate(template.key)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Template Preview</CardTitle>
                  <CardDescription>
                    Select a template from the list to preview its structure and sections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Template preview functionality will be available soon.
                    This will show a preview of how the generated report will look.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}