
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormBuilderTemplate } from '@/types/formBuilder';

interface UseFormsByCategoryOptions {
  category?: string;
  publishedOnly?: boolean;
}

export function useFormsByCategory(options: UseFormsByCategoryOptions = {}) {
  const [forms, setForms] = useState<FormBuilderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { category, publishedOnly = true } = options;

  useEffect(() => {
    fetchForms();
  }, [category, publishedOnly]);

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('form_templates')
        .select('*')
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      if (publishedOnly) {
        query = query.eq('is_published', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform to FormBuilderTemplate format (sections loaded separately in FormRenderer)
      const templates: FormBuilderTemplate[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        category: template.category,
        isPublished: template.is_published,
        version: template.version,
        sections: [],
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }));

      setForms(templates);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  return { forms, loading, error, refetch: fetchForms };
}

export function useFormSubmissions(workOrderId?: string, customerId?: string, vehicleId?: string) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workOrderId || customerId || vehicleId) {
      fetchSubmissions();
    }
  }, [workOrderId, customerId, vehicleId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('form_submissions')
        .select(`
          *,
          form_templates (
            id,
            name,
            category,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (workOrderId) {
        query = query.eq('work_order_id', workOrderId);
      }
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching form submissions:', err);
      setError('Failed to load form submissions');
    } finally {
      setLoading(false);
    }
  };

  return { submissions, loading, error, refetch: fetchSubmissions };
}
