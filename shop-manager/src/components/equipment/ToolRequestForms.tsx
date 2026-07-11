import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToolRequestFormBuilder } from './ToolRequestFormBuilder';
import { ToolRequestFormPreview } from './ToolRequestFormPreview';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  content: any;
  is_published: boolean;
  created_at: string;
}

export function ToolRequestForms() {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [editingForm, setEditingForm] = useState<FormTemplate | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('category', 'tool_request')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formsWithContent = (data || []).map((form: any) => ({
        ...form,
        content: form.content || { fields: [] }
      }));
      
      setForms(formsWithContent);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Form deleted successfully',
      });
      loadForms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (form: FormTemplate) => {
    try {
      const { error } = await supabase
        .from('form_templates')
        .update({ is_published: !form.is_published })
        .eq('id', form.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Form ${form.is_published ? 'unpublished' : 'published'} successfully`,
      });
      loadForms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (showBuilder) {
    return (
      <ToolRequestFormBuilder
        form={editingForm}
        onClose={() => {
          setShowBuilder(false);
          setEditingForm(null);
          loadForms();
        }}
      />
    );
  }

  if (selectedForm) {
    return (
      <ToolRequestFormPreview
        form={selectedForm}
        onClose={() => setSelectedForm(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tool Request Forms</h2>
          <p className="text-muted-foreground">Create and manage forms for tool requests</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading forms...</div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Request Forms</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tool request form to streamline the checkout process
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{form.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    form.is_published ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {form.is_published ? 'Published' : 'Draft'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {form.description || 'No description'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedForm(form)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingForm(form);
                      setShowBuilder(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePublish(form)}
                  >
                    {form.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(form.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
