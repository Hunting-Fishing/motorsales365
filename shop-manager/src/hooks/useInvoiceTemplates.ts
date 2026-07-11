
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { InvoiceTemplate, InvoiceItem } from '@/types/invoice';

export function useInvoiceTemplates() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected interface
      const transformedData = (data || []).map(template => ({
        ...template,
        last_used: template.last_used || null,
        default_items: [] as InvoiceItem[] // Default to empty array since database doesn't have this field
      }));
      
      setTemplates(transformedData);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load invoice templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<InvoiceTemplate, 'id' | 'created_at' | 'usage_count'>) => {
    try {
      // Prepare data for database (exclude default_items since it's not a database field)
      const { default_items, ...dbTemplateData } = templateData;
      
      const { data, error } = await supabase
        .from('invoice_templates')
        .insert([{
          ...dbTemplateData,
          usage_count: 0,
          last_used: templateData.last_used || null
        }])
        .select()
        .single();

      if (error) throw error;

      const newTemplate: InvoiceTemplate = {
        ...data,
        last_used: data.last_used || null,
        default_items: default_items || []
      };

      setTemplates(prev => [newTemplate, ...prev]);
      toast({
        title: "Success",
        description: "Template created successfully"
      });
      
      return newTemplate;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
      throw err;
    }
  };

  const saveAsTemplate = async (templateData: {
    name: string;
    description: string;
    default_tax_rate: number;
    default_due_date_days: number;
    default_notes: string;
    default_items: InvoiceItem[];
  }) => {
    return createTemplate({
      ...templateData,
      last_used: null
    });
  };

  const saveTemplate = async (templateData: Omit<InvoiceTemplate, 'id' | 'created_at' | 'usage_count'>) => {
    return createTemplate(templateData);
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    saveAsTemplate,
    saveTemplate,
    refetch: fetchTemplates
  };
}
