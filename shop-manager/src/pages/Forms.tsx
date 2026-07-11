import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, Plus, Download, Edit, Upload, Wand2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormBuilderEditor } from '@/components/forms/builder/FormBuilderEditor';
import { FormRenderer } from '@/components/forms/FormRenderer';
import { getAllFormTemplates, deleteFormTemplate, FormQueryParams } from '@/services/formBuilderService';
import { FormBuilderTemplate } from '@/types/formBuilder';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { AllCustomerForms } from '@/components/forms/AllCustomerForms';
import { CustomerFormUploadDialog } from '@/components/forms/CustomerFormUploadDialog';
import { FormDigitizationWizard } from '@/components/forms/digitize/FormDigitizationWizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function Forms() {
  const [templates, setTemplates] = useState<Partial<FormBuilderTemplate>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDigitizeOpen, setIsDigitizeOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormBuilderTemplate | undefined>();
  const [previewTemplate, setPreviewTemplate] = useState<FormBuilderTemplate | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [digitizeSource, setDigitizeSource] = useState<any>(null);
  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ['form-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: uploadedFormsCount } = useQuery({
    queryKey: ['uploaded-forms-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customer_uploaded_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    }
  });

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    const params: FormQueryParams = {};
    if (categoryFilter !== 'all') {
      params.category = categoryFilter;
    }
    const data = await getAllFormTemplates(params);
    setTemplates(data);
    setLoading(false);
  };

  const handleCreateNew = () => {
    setEditingTemplate(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: Partial<FormBuilderTemplate>) => {
    setEditingTemplate(template as FormBuilderTemplate);
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    setIsEditorOpen(false);
    loadTemplates();
  };

  const handlePreview = (template: FormBuilderTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      const success = await deleteFormTemplate(id);
      if (success) {
        toast({ title: 'Form deleted successfully' });
        loadTemplates();
      } else {
        toast({ title: 'Failed to delete form', variant: 'destructive' });
      }
    }
  };

  const handleDigitize = (form: any) => {
    setDigitizeSource({
      id: form.id,
      file_path: form.file_path,
      file_name: form.file_name,
      title: form.title
    });
    setIsDigitizeOpen(true);
  };

  const handleDigitizeNew = () => {
    setDigitizeSource(null);
    setIsDigitizeOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Forms | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Forms Management</h1>
            <p className="text-muted-foreground">
              Create and manage customer forms, work order templates, and documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Form
            </Button>
            <Button variant="outline" onClick={handleDigitizeNew}>
              <Wand2 className="h-4 w-4 mr-2" />
              Digitize Form
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                Active form templates
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.isPublished).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uploadedFormsCount}</div>
              <p className="text-xs text-muted-foreground">
                Customer uploads
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(templates.map(t => t.category)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique categories
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="templates">Form Templates</TabsTrigger>
              <TabsTrigger value="uploads">
                Customer Uploads
                {uploadedFormsCount && uploadedFormsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{uploadedFormsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Form Templates</CardTitle>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No forms yet. Create your first form to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Card key={template.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{template.name}</h3>
                              <Badge variant={template.isPublished ? 'default' : 'secondary'}>
                                {template.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                              <Badge variant="outline">{template.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description || 'No description'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.id!)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uploads">
            <Card>
              <CardHeader>
                <CardTitle>Customer Uploaded Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <AllCustomerForms onDigitize={handleDigitize} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Form Submissions</CardTitle>
                <Link to="/form-submissions">
                  <Button variant="outline" size="sm">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View All Submissions
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>View and manage all form submissions</p>
                  <Link to="/form-submissions">
                    <Button variant="link" className="mt-2">
                      Go to Submissions Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
          </DialogHeader>
          <FormBuilderEditor
            template={editingTemplate}
            onSave={handleSave}
            onPreview={handlePreview}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <FormRenderer
              templateId={previewTemplate.id}
              onSubmit={(data) => {
                console.log('Preview submission:', data);
                toast({ title: 'Form submitted (preview mode)' });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <CustomerFormUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
      />

      {/* Digitization Wizard */}
      <FormDigitizationWizard
        open={isDigitizeOpen}
        onOpenChange={setIsDigitizeOpen}
        sourceDocument={digitizeSource}
      />
    </>
  );
}
