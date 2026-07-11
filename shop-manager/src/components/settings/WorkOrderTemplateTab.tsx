import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Copy,
  Eye,
  Settings,
  Clipboard
} from 'lucide-react';

interface WorkOrderTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_default: boolean;
  is_active: boolean;
  fields: TemplateField[];
  instructions: string;
  estimated_hours?: number;
  priority: string;
  created_at: string;
}

interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  default_value?: string;
  options?: string[]; // For select fields
  placeholder?: string;
  order: number;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' }
];

const TEMPLATE_CATEGORIES = [
  'Maintenance',
  'Repair',
  'Inspection',
  'Installation',
  'Diagnostic',
  'Custom'
];

export function WorkOrderTemplateTab() {
  const [templates, setTemplates] = useState<WorkOrderTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkOrderTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WorkOrderTemplate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const { shopId, loading: shopLoading } = useShopId();

  useEffect(() => {
    if (shopId) {
      loadTemplates();
    }
  }, [shopId]);

  const loadTemplates = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'work_order_templates')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings_value) {
        const templatesData = data.settings_value as unknown;
        if (Array.isArray(templatesData)) {
          setTemplates(templatesData as WorkOrderTemplate[]);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load work order templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    if (!shopId) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          shop_id: shopId,
          settings_key: 'work_order_templates',
          settings_value: templates as any,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Templates saved successfully",
      });
    } catch (error) {
      console.error('Error saving templates:', error);
      toast({
        title: "Error",
        description: "Failed to save templates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createNewTemplate = () => {
    const newTemplate: Partial<WorkOrderTemplate> = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      category: 'Custom',
      is_default: false,
      is_active: true,
      fields: [],
      instructions: '',
      priority: 'medium',
      created_at: new Date().toISOString()
    };
    setEditingTemplate(newTemplate);
    setShowEditor(true);
  };

  const editTemplate = (template: WorkOrderTemplate) => {
    setEditingTemplate({ ...template });
    setShowEditor(true);
  };

  const duplicateTemplate = (template: WorkOrderTemplate) => {
    const duplicated: WorkOrderTemplate = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString()
    };
    setTemplates(prev => [...prev, duplicated]);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const saveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    const existingIndex = templates.findIndex(t => t.id === editingTemplate.id);
    
    if (existingIndex >= 0) {
      setTemplates(prev => prev.map((t, i) => i === existingIndex ? editingTemplate as WorkOrderTemplate : t));
    } else {
      setTemplates(prev => [...prev, editingTemplate as WorkOrderTemplate]);
    }

    setEditingTemplate(null);
    setShowEditor(false);
  };

  const addField = () => {
    if (!editingTemplate) return;
    
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      name: '',
      type: 'text',
      label: '',
      required: false,
      order: editingTemplate.fields?.length || 0
    };

    setEditingTemplate(prev => ({
      ...prev,
      fields: [...(prev?.fields || []), newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    if (!editingTemplate) return;
    
    setEditingTemplate(prev => ({
      ...prev,
      fields: prev?.fields?.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ) || []
    }));
  };

  const removeField = (fieldId: string) => {
    if (!editingTemplate) return;
    
    setEditingTemplate(prev => ({
      ...prev,
      fields: prev?.fields?.filter(field => field.id !== fieldId) || []
    }));
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clipboard className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Work Order Templates</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={createNewTemplate}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
          <Button onClick={saveTemplates} disabled={saving} variant="outline">
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {!showEditor ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{template.category}</Badge>
                      <Badge variant={template.priority === 'high' ? 'destructive' : template.priority === 'low' ? 'secondary' : 'default'}>
                        {template.priority}
                      </Badge>
                      {template.is_default && <Badge variant="outline">Default</Badge>}
                    </div>
                  </div>
                  <Switch 
                    checked={template.is_active}
                    onCheckedChange={(checked) => {
                      setTemplates(prev => prev.map(t => 
                        t.id === template.id ? { ...t, is_active: checked } : t
                      ));
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{template.description}</p>
                
                <div className="text-sm">
                  <span className="font-medium">{template.fields?.length || 0}</span> custom fields
                  {template.estimated_hours && (
                    <span className="ml-3">
                      <span className="font-medium">{template.estimated_hours}h</span> estimated
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editTemplate(template)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first work order template to standardize your processes
              </p>
              <Button onClick={createNewTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplate?.name ? `Edit: ${editingTemplate.name}` : 'New Template'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  value={editingTemplate?.name || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template_category">Category</Label>
                <Select 
                  value={editingTemplate?.category} 
                  onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template_priority">Priority</Label>
                <Select 
                  value={editingTemplate?.priority} 
                  onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  value={editingTemplate?.estimated_hours || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ 
                    ...prev, 
                    estimated_hours: parseFloat(e.target.value) || undefined 
                  }))}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_description">Description</Label>
              <Textarea
                id="template_description"
                value={editingTemplate?.description || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when to use this template"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_instructions">Instructions</Label>
              <Textarea
                id="template_instructions"
                value={editingTemplate?.instructions || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Special instructions for technicians"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={editingTemplate?.is_default || false}
                  onCheckedChange={(checked) => setEditingTemplate(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is_default">Set as Default Template</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingTemplate?.is_active !== false}
                  onCheckedChange={(checked) => setEditingTemplate(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Custom Fields</Label>
                <Button onClick={addField} size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>

              {editingTemplate?.fields?.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Field Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select 
                        value={field.type} 
                        onValueChange={(value: any) => updateField(field.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Field Name</Label>
                      <Input
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                        placeholder="field_name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Actions</Label>
                      <div className="flex gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                        />
                        <span className="text-sm">Required</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeField(field.id)}
                          className="ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div className="mt-4 space-y-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={field.options?.join('\n') || ''}
                        onChange={(e) => updateField(field.id, { 
                          options: e.target.value.split('\n').filter(opt => opt.trim()) 
                        })}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Placeholder text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default Value</Label>
                      <Input
                        value={field.default_value || ''}
                        onChange={(e) => updateField(field.id, { default_value: e.target.value })}
                        placeholder="Default value"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveTemplate}>
                <Save className="h-4 w-4 mr-1" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Template Preview: {selectedTemplate.name}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedTemplate(null)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Category:</strong> {selectedTemplate.category}</div>
                <div><strong>Priority:</strong> {selectedTemplate.priority}</div>
                {selectedTemplate.estimated_hours && (
                  <div><strong>Estimated Hours:</strong> {selectedTemplate.estimated_hours}</div>
                )}
                <div><strong>Status:</strong> {selectedTemplate.is_active ? 'Active' : 'Inactive'}</div>
              </div>

              {selectedTemplate.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              )}

              {selectedTemplate.instructions && (
                <div>
                  <strong>Instructions:</strong>
                  <p className="mt-1 text-muted-foreground">{selectedTemplate.instructions}</p>
                </div>
              )}

              {selectedTemplate.fields && selectedTemplate.fields.length > 0 && (
                <div>
                  <strong>Custom Fields:</strong>
                  <div className="mt-2 space-y-3">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{field.label}</span>
                          {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          <Badge variant="secondary" className="text-xs">{field.type}</Badge>
                        </div>
                        {field.placeholder && (
                          <p className="text-sm text-muted-foreground">Placeholder: {field.placeholder}</p>
                        )}
                        {field.default_value && (
                          <p className="text-sm text-muted-foreground">Default: {field.default_value}</p>
                        )}
                        {field.options && field.options.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Options: </span>
                            <span className="text-sm text-muted-foreground">{field.options.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}