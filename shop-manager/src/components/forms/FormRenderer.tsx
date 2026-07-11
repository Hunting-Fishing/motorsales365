
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FormBuilderTemplate, FormBuilderField } from '@/types/formBuilder';
import { useFormSubmission, FormFieldValue } from '@/hooks/useFormSubmission';
import { getFormTemplate } from '@/services/formBuilderService';
import { CompactSignaturePad } from '@/components/signature/CompactSignaturePad';

interface FormRendererProps {
  templateId: string;
  onSubmit?: (data: Record<string, any>) => void;
  customerId?: string;
  vehicleId?: string;
  workOrderId?: string;
}

export const FormRenderer = ({ 
  templateId, 
  onSubmit, 
  customerId,
  vehicleId,
  workOrderId
}: FormRendererProps) => {
  const [template, setTemplate] = useState<FormBuilderTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const { submitForm, isSubmitting, error, success } = useFormSubmission();
  const { toast } = useToast();

  useEffect(() => {
    async function loadTemplate() {
      setLoading(true);
      const templateData = await getFormTemplate(templateId);
      setTemplate(templateData);
      setLoading(false);
    }

    loadTemplate();
  }, [templateId]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      templateId,
      submittedData: formValues,
      customerId,
      vehicleId,
      workOrderId
    };
    
    const result = await submitForm(submissionData);
    
    if (result && onSubmit) {
      onSubmit(formValues);
    }
    
    if (result) {
      toast({
        title: "Form submitted successfully",
        description: "Thank you for your submission",
        variant: "default",
      });
    } else {
      toast({
        title: "Error submitting form",
        description: error || "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const renderField = (field: FormBuilderField) => {
    switch (field.fieldType) {
      case 'text':
        return (
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );
      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
          />
        );
      case 'email':
        return (
          <Input
            id={field.id}
            type="email"
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );
      case 'phone':
        return (
          <Input
            id={field.id}
            type="tel"
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );
      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder || ''}
            value={formValues[field.id] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.isRequired}
            rows={4}
          />
        );
      case 'checkbox':
        return (
          <Checkbox
            id={field.id}
            checked={formValues[field.id] || false}
            onCheckedChange={(checked) => handleInputChange(field.id, checked)}
            required={field.isRequired}
          />
        );
      case 'radio':
        return (
          <RadioGroup
            value={formValues[field.id] || field.defaultValue || ''}
            onValueChange={(value) => handleInputChange(field.id, value)}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <label htmlFor={`${field.id}-${option.value}`}>{option.label}</label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'select':
        return (
          <Select
            value={formValues[field.id] || field.defaultValue || ''}
            onValueChange={(value) => handleInputChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'file':
        return (
          <Input
            id={field.id}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleInputChange(field.id, file.name);
              }
            }}
            required={field.isRequired}
          />
        );
      case 'signature':
        return (
          <CompactSignaturePad
            value={formValues[field.id] || ''}
            onChange={(signature) => handleInputChange(field.id, signature)}
            required={field.isRequired}
          />
        );
      default:
        return <Input placeholder="Unsupported field type" disabled />;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading form...</div>;
  }

  if (!template) {
    return <div className="p-8 text-center">Form not found</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        {template.description && <CardDescription>{template.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {template.sections.map((section) => (
            <div key={section.id} className="space-y-4">
              <h3 className="text-lg font-medium">{section.title}</h3>
              {section.description && <p className="text-sm text-gray-500">{section.description}</p>}
              
              {section.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center">
                    <label htmlFor={field.id} className="text-sm font-medium">
                      {field.label}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                  {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
                  {renderField(field)}
                </div>
              ))}
            </div>
          ))}
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FormRenderer;
