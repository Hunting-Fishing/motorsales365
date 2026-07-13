
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface PersonalizationField {
  key: string;
  value: string;
}

export interface SegmentField {
  key: string;
  value: string;
}

export const enrollFormSchema = z.object({
  sequenceId: z.string().min(1, { message: "Please select a sequence" }),
  personalizations: z.record(z.string()).optional(),
  segmentData: z.record(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type EnrollCustomerFormValues = z.infer<typeof enrollFormSchema>;

export function useEnrollCustomerForm(customerId: string, onEnroll?: (enrollmentId: string) => void) {
  const [open, setOpen] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [personalizationFields, setPersonalizationFields] = useState<PersonalizationField[]>([]);
  const [segmentFields, setSegmentFields] = useState<SegmentField[]>([]);
  const [metadataJson, setMetadataJson] = useState('{}');
  const { toast } = useToast();

  const form = useForm<EnrollCustomerFormValues>({
    resolver: zodResolver(enrollFormSchema),
    defaultValues: {
      sequenceId: "",
      personalizations: {},
      segmentData: {},
      metadata: {},
    },
  });

  useEffect(() => {
    if (open) {
      fetchSequences();
      fetchCustomer();
    }
  }, [customerId, open]);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('is_active', true);
        
      if (error) throw error;
      setSequences(data || []);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast({
        title: 'Error',
        description: 'Could not load email sequences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
        
      if (error) throw error;
      setCustomer(data);
      
      const initialFields = [
        { key: 'first_name', value: data.first_name || '' },
        { key: 'last_name', value: data.last_name || '' },
        { key: 'email', value: data.email || '' },
      ];
      setPersonalizationFields(initialFields);
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const addPersonalizationField = () => {
    setPersonalizationFields([...personalizationFields, { key: '', value: '' }]);
  };
  
  const updatePersonalizationField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...personalizationFields];
    newFields[index][field] = value;
    setPersonalizationFields(newFields);
  };
  
  const removePersonalizationField = (index: number) => {
    const newFields = [...personalizationFields];
    newFields.splice(index, 1);
    setPersonalizationFields(newFields);
  };
  
  const addSegmentField = () => {
    setSegmentFields([...segmentFields, { key: '', value: '' }]);
  };
  
  const updateSegmentField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...segmentFields];
    newFields[index][field] = value;
    setSegmentFields(newFields);
  };
  
  const removeSegmentField = (index: number) => {
    const newFields = [...segmentFields];
    newFields.splice(index, 1);
    setSegmentFields(newFields);
  };

  const handleSubmit = async (values: EnrollCustomerFormValues) => {
    try {
      const personalizations = personalizationFields.reduce((acc, field) => {
        if (field.key && field.value) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {} as Record<string, string>);
      
      const segmentData = segmentFields.reduce((acc, field) => {
        if (field.key && field.value) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {} as Record<string, string>);
      
      let metadata = {};
      try {
        metadata = JSON.parse(metadataJson);
      } catch (e) {
        toast({
          title: 'Invalid JSON',
          description: 'The metadata is not valid JSON. Using empty object instead.',
          variant: 'destructive',
        });
      }
      
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .insert({
          sequence_id: values.sequenceId,
          customer_id: customerId,
          status: 'active',
          next_send_time: new Date().toISOString(),
          metadata: {
            personalizations,
            segmentData,
            ...metadata
          }
        })
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: 'Customer Enrolled',
        description: 'The customer has been enrolled in the sequence successfully.',
      });
      
      setOpen(false);
      
      if (onEnroll) {
        onEnroll(data.id);
      }
      
      try {
        await supabase.functions.invoke('process-email-sequences', {
          body: { 
            sequenceId: values.sequenceId, 
            action: 'process' 
          }
        });
      } catch (processError) {
        console.error('Error triggering sequence processing:', processError);
      }
      
    } catch (error) {
      console.error('Error enrolling customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll customer in sequence',
        variant: 'destructive',
      });
    }
  };

  return {
    form,
    open,
    setOpen,
    sequences,
    loading,
    customer,
    personalizationFields,
    segmentFields,
    metadataJson,
    setMetadataJson,
    addPersonalizationField,
    updatePersonalizationField,
    removePersonalizationField,
    addSegmentField,
    updateSegmentField,
    removeSegmentField,
    handleSubmit
  };
}
