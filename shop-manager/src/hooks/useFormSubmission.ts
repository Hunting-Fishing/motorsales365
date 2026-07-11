
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface FormFieldValue {
  fieldId: string;
  value: string | number | boolean | string[] | null;
}

export interface FormSubmissionData {
  templateId: string;
  submittedData: Record<string, any>;
  customerId?: string;
  vehicleId?: string;
  workOrderId?: string;
}

export function useFormProcessor() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const processForm = async (values: FormFieldValue[]) => {
    // Process form values into a structured format
    const processedData: Record<string, any> = {};
    
    values.forEach(field => {
      processedData[field.fieldId] = field.value;
    });
    
    return processedData;
  };

  return { processForm };
}

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitForm = async (data: FormSubmissionData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Type assertion to handle Supabase typing issues
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          template_id: data.templateId,
          submitted_data: data.submittedData,
          customer_id: data.customerId || null,
          vehicle_id: data.vehicleId || null,
          work_order_id: data.workOrderId || null,
          submitted_by: (await supabase.auth.getUser()).data.user?.id || null
        });

      if (error) throw error;

      setSuccess(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit form');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForm,
    isSubmitting,
    error,
    success,
    reset: () => {
      setError(null);
      setSuccess(false);
    }
  };
}

export default useFormSubmission;
