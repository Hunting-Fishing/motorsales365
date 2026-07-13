import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ToolRequestFormPreviewProps {
  form: any;
  onClose: () => void;
}

export function ToolRequestFormPreview({ form, onClose }: ToolRequestFormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = form.content?.fields?.filter((field: any) => 
      field.required && !formData[field.id]
    );

    if (missingFields?.length > 0) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          template_id: form.id,
          submitted_data: formData,
          submitted_by: user?.id,
          shop_id: profile?.shop_id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tool request submitted successfully',
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setFormData({ ...formData, [field.id]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, [field.id]: checked })
              }
            />
            <Label>{field.label}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description && (
            <p className="text-muted-foreground">{form.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {form.content?.fields?.map((field: any) => (
            <div key={field.id} className="space-y-2">
              {field.type !== 'checkbox' && (
                <Label>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
              )}
              {renderField(field)}
            </div>
          ))}

          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
