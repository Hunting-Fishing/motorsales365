import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { saveFormTemplate } from '@/services/formBuilderService';
import { FormBuilderTemplate, FormBuilderSection, FormBuilderField, FormFieldType } from '@/types/formBuilder';
import { DocumentPreview } from './DocumentPreview';
import { DocumentFieldMapper } from './DocumentFieldMapper';
import { ChevronLeft, ChevronRight, Save, FileText, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FormDigitizationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDocument?: {
    id: string;
    file_path: string;
    file_name: string;
    title: string;
  };
}

interface FieldDefinition {
  id: string;
  label: string;
  fieldType: FormFieldType;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
}

export function FormDigitizationWizard({ open, onOpenChange, sourceDocument }: FormDigitizationWizardProps) {
  const [step, setStep] = useState(1);
  const [formName, setFormName] = useState(sourceDocument?.title || '');
  const [formDescription, setFormDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load document URL when source document changes
  React.useEffect(() => {
    if (sourceDocument?.file_path) {
      loadDocumentUrl();
      setFormName(sourceDocument.title || '');
    }
  }, [sourceDocument]);

  const loadDocumentUrl = async () => {
    if (!sourceDocument?.file_path) return;
    
    const { data } = await supabase.storage
      .from('customer_forms')
      .createSignedUrl(sourceDocument.file_path, 3600);
    
    if (data?.signedUrl) {
      setDocumentUrl(data.signedUrl);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Create template structure
      const sectionId = uuidv4();
      const template: FormBuilderTemplate = {
        id: 'new',
        name: formName,
        description: formDescription,
        category,
        isPublished: false,
        version: 1,
        sections: [{
          id: sectionId,
          templateId: 'new',
          title: 'Main Section',
          displayOrder: 0,
          fields: fields.map((field, index) => ({
            id: uuidv4(),
            sectionId,
            label: field.label,
            fieldType: field.fieldType,
            placeholder: field.placeholder,
            helpText: field.helpText,
            isRequired: field.isRequired,
            displayOrder: index
          }))
        }]
      };

      const savedTemplate = await saveFormTemplate(template);
      if (!savedTemplate) throw new Error('Failed to save template');

      // Update source document status if exists
      if (sourceDocument?.id) {
        await supabase
          .from('customer_uploaded_forms')
          .update({ status: 'digitized' })
          .eq('id', sourceDocument.id);
      }

      return savedTemplate;
    },
    onSuccess: () => {
      toast({ title: 'Form template created successfully' });
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['customer-uploaded-forms'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({ title: 'Failed to create form template', variant: 'destructive' });
    }
  });

  const handleClose = () => {
    setStep(1);
    setFormName('');
    setFormDescription('');
    setCategory('general');
    setFields([]);
    setDocumentUrl(null);
    onOpenChange(false);
  };

  const addField = () => {
    setFields([...fields, {
      id: uuidv4(),
      label: '',
      fieldType: 'text',
      isRequired: false
    }]);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!formName;
      case 2:
        return true;
      case 3:
        return fields.length > 0 && fields.every(f => f.label);
      default:
        return false;
    }
  };

  const fieldTypes: { value: FormFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'signature', label: 'Signature' },
    { value: 'file', label: 'File Upload' }
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Form Digitization Wizard - Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="formName">Form Name *</Label>
                <Input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter form name"
                />
              </div>

              <div>
                <Label htmlFor="formDescription">Description</Label>
                <Textarea
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the purpose of this form"
                  rows={3}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="consent">Consent</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="authorization">Authorization</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sourceDocument && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Source Document</p>
                        <p className="text-sm text-muted-foreground">{sourceDocument.file_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Review the source document and identify the fields you need to create.
              </p>
              <DocumentPreview documentUrl={documentUrl} fileName={sourceDocument?.file_name} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Add the fields that will appear in your digital form.
                </p>
                <Button onClick={addField} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fields added yet</p>
                    <p className="text-sm">Click "Add Field" to start building your form</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-1 flex items-center justify-center pt-2">
                            <span className="text-sm text-muted-foreground">{index + 1}</span>
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">Field Label *</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="Enter label"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Field Type</Label>
                            <Select
                              value={field.fieldType}
                              onValueChange={(value: FormFieldType) => updateField(field.id, { fieldType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="col-span-1 flex items-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(field.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 ml-8 flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.isRequired}
                              onChange={(e) => updateField(field.id, { isRequired: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canProceed() || saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? 'Saving...' : 'Create Template'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
