import { supabase } from '@/lib/supabase';
import { EmailTemplate, EmailTemplateVariable, EmailCategory } from '@/types/email';
import { GenericResponse, parseJsonField } from '../utils/supabaseHelper';

// Helper function to convert database template to typed EmailTemplate
const mapDbTemplateToEmailTemplate = (template: any): EmailTemplate => {
  // Parse variables from JSON
  let variables: EmailTemplateVariable[] = [];
  try {
    if (template.variables) {
      variables = Array.isArray(template.variables) 
        ? template.variables
        : typeof template.variables === 'object'
          ? Object.values(template.variables)
          : [];
    }
  } catch (e) {
    console.error('Error parsing template variables:', e);
  }

  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    description: template.description || '',
    category: template.category as EmailCategory,
    content: template.content,
    body: template.content, // For compatibility
    variables: variables,
    created_at: template.created_at,
    updated_at: template.updated_at,
    is_archived: template.is_archived || false
  };
};

/**
 * Service for managing email templates
 */
export const emailTemplateService = {
  /**
   * Get all email templates
   * @returns List of templates
   */
  async getAllTemplates(): Promise<GenericResponse<EmailTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      const templates = data.map(template => mapDbTemplateToEmailTemplate(template));
      
      return { data: templates, error: null };
    } catch (error) {
      console.error('Error getting all templates:', error);
      return { data: [], error };
    }
  },

  /**
   * Create a new email template
   * @param template Template data
   * @returns Created template
   */
  async createTemplate(template: Partial<EmailTemplate>): Promise<GenericResponse<EmailTemplate>> {
    try {
      // Convert variables to JSON compatible format
      const variablesJson = template.variables ? JSON.parse(JSON.stringify(template.variables)) : [];
      
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: template.name,
          subject: template.subject,
          content: template.content || template.body,
          description: template.description,
          category: template.category,
          variables: variablesJson,
          is_archived: template.is_archived || false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { 
        data: mapDbTemplateToEmailTemplate(data),
        error: null 
      };
    } catch (error) {
      console.error('Error creating template:', error);
      return { data: null, error };
    }
  },

  /**
   * Get a single email template by ID
   * @param id Template ID
   * @returns Template data
   */
  async getTemplateById(id: string): Promise<GenericResponse<EmailTemplate>> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return { 
        data: mapDbTemplateToEmailTemplate(data), 
        error: null 
      };
    } catch (error) {
      console.error('Error getting template by ID:', error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing email template
   * @param id Template ID
   * @param template Template data to update
   * @returns Updated template
   */
  async updateTemplate(
    id: string, 
    template: Partial<EmailTemplate>
  ): Promise<GenericResponse<EmailTemplate>> {
    try {
      // Convert variables to JSON compatible format
      const variablesJson = template.variables ? JSON.parse(JSON.stringify(template.variables)) : [];
      
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          name: template.name,
          subject: template.subject,
          content: template.content || template.body,
          description: template.description,
          category: template.category,
          variables: variablesJson,
          is_archived: template.is_archived
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return { 
        data: mapDbTemplateToEmailTemplate(data), 
        error: null 
      };
    } catch (error) {
      console.error('Error updating template:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete an email template
   * @param id Template ID
   * @returns Success status
   */
  async deleteTemplate(id: string): Promise<GenericResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return { 
        data: { success: true }, 
        error: null 
      };
    } catch (error) {
      console.error('Error deleting template:', error);
      return { 
        data: { success: false }, 
        error 
      };
    }
  },

  /**
   * Archive an email template
   * @param id Template ID
   * @param isArchived Archive status
   * @returns Success status
   */
  async archiveTemplate(
    id: string, 
    isArchived: boolean
  ): Promise<GenericResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_archived: isArchived })
        .eq('id', id);
      
      if (error) throw error;
      
      return { 
        data: { success: true }, 
        error: null 
      };
    } catch (error) {
      console.error('Error archiving template:', error);
      return { 
        data: { success: false }, 
        error 
      };
    }
  }
};
