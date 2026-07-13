
import { useState, useEffect } from 'react';
import { EmailTemplate, EmailCategory, EmailTemplateVariable } from '@/types/email';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Helper to parse template variables
function parseTemplateVariables(variablesData: any): EmailTemplateVariable[] {
  let variables: EmailTemplateVariable[] = [];
  if (variablesData) {
    try {
      // Handle both string and array formats
      const varsData = typeof variablesData === 'string' 
        ? JSON.parse(variablesData) 
        : variablesData;
      
      if (Array.isArray(varsData)) {
        variables = varsData.map((v: any) => ({
          id: v.id || String(Math.random()),
          name: v.name || '',
          description: v.description || '',
          default_value: v.default_value || v.defaultValue || '',
          defaultValue: v.defaultValue || v.default_value || ''
        }));
      }
    } catch (e) {
      console.error('Error parsing template variables:', e);
    }
  }
  return variables;
}

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Fetch all email templates
   */
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert raw data to EmailTemplate type
      const formattedTemplates: EmailTemplate[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        description: item.description || '',
        category: item.category as EmailCategory,
        content: item.content,
        variables: parseTemplateVariables(item.variables),
        created_at: item.created_at,
        updated_at: item.updated_at,
        body: item.content, // For backward compatibility
        is_archived: item.is_archived || false
      }));

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get a single template by ID
   */
  const getTemplateById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Convert raw data to EmailTemplate type
      const formattedTemplate: EmailTemplate = {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: parseTemplateVariables(data.variables),
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };

      return formattedTemplate;
    } catch (error) {
      console.error("Error fetching email template:", error);
      toast({
        title: "Error",
        description: "Failed to load email template",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Create a new email template
   */
  const createTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: template.name,
          subject: template.subject,
          description: template.description,
          category: template.category,
          content: template.content || template.body
        })
        .select()
        .single();

      if (error) throw error;

      // Convert raw data to EmailTemplate type
      const formattedTemplate: EmailTemplate = {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: parseTemplateVariables(data.variables),
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };

      toast({
        title: "Success",
        description: "Email template created successfully",
      });

      fetchTemplates();
      return formattedTemplate;
    } catch (error) {
      console.error("Error creating email template:", error);
      toast({
        title: "Error",
        description: "Failed to create email template",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Update an existing email template
   */
  const updateTemplate = async (id: string, template: Partial<EmailTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          name: template.name,
          subject: template.subject,
          description: template.description,
          category: template.category,
          content: template.content || template.body
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Convert raw data to EmailTemplate type
      const formattedTemplate: EmailTemplate = {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: parseTemplateVariables(data.variables),
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };

      toast({
        title: "Success",
        description: "Email template updated successfully",
      });

      fetchTemplates();
      return formattedTemplate;
    } catch (error) {
      console.error("Error updating email template:", error);
      toast({
        title: "Error",
        description: "Failed to update email template",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Delete an email template
   */
  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template deleted successfully",
      });

      fetchTemplates();
      return true;
    } catch (error) {
      console.error("Error deleting email template:", error);
      toast({
        title: "Error",
        description: "Failed to delete email template",
        variant: "destructive",
      });
      return false;
    }
  };

  // Load templates on initial mount
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  /**
   * Send a test email using a template
   */
  const sendTestEmail = async (templateId: string, recipientEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { 
          templateId,
          recipientEmail
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${recipientEmail}`,
      });
      
      return { success: true, data };
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Load templates on initial mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    sendTestEmail
  };
};
