import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface ToolRequestFormBuilderProps {
  form?: any;
  onClose: () => void;
}

export function ToolRequestFormBuilder({ form, onClose }: ToolRequestFormBuilderProps) {
  const [name, setName] = useState(form?.name || '');
  const [description, setDescription] = useState(form?.description || '');
  const [fields, setFields] = useState<FormField[]>(form?.content?.fields || []);
  const [saving, setSaving] = useState(false);

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: '',
      required: false,
      options: type === 'select' ? [''] : undefined,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const addOption = (fieldId: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options) {
        return { ...field, options: [...field.options, ''] };
      }
      return field;
    }));
  };

  const updateOption = (fieldId: string, index: number, value: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options) {
        const newOptions = [...field.options];
        newOptions[index] = value;
        return { ...field, options: newOptions };
      }
      return field;
    }));
  };

  const removeOption = (fieldId: string, index: number) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options) {
        return { ...field, options: field.options.filter((_, i) => i !== index) };
      }
      return field;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Form name is required',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Add at least one field to the form',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();

      const formData = {
        name,
        description,
        category: 'tool_request',
        content: { fields },
        is_published: false,
        version: form?.version ? form.version + 1 : 1,
        shop_id: profile?.shop_id,
      };

      if (form?.id) {
        const { error } = await supabase
          .from('form_templates')
          .update(formData)
          .eq('id', form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('form_templates')
          .insert(formData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Form ${form?.id ? 'updated' : 'created'} successfully`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Form'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Power Tool Request Form"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this form"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Field</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => addField('text')}>Text</Button>
                <Button variant="outline" onClick={() => addField('textarea')}>Textarea</Button>
                <Button variant="outline" onClick={() => addField('number')}>Number</Button>
                <Button variant="outline" onClick={() => addField('date')}>Date</Button>
                <Button variant="outline" onClick={() => addField('select')}>Dropdown</Button>
                <Button variant="outline" onClick={() => addField('checkbox')}>Checkbox</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Form Fields ({fields.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {fields.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No fields added yet. Add fields using the buttons on the left.
              </p>
            ) : (
              fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Field {index + 1} ({field.type})</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Field Label"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />

                    {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                      <Input
                        placeholder="Placeholder text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      />
                    )}

                    {field.type === 'select' && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {field.options?.map((option, optIndex) => (
                          <div key={optIndex} className="flex gap-2">
                            <Input
                              placeholder={`Option ${optIndex + 1}`}
                              value={option}
                              onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(field.id, optIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(field.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => 
                          updateField(field.id, { required: checked as boolean })
                        }
                      />
                      <Label>Required field</Label>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
