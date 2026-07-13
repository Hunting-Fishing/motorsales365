
import { supabase } from '@/lib/supabase';
import { EmailTemplate, EmailCategory, EmailTemplateVariable } from '@/types/email';
import { parseJsonField } from './utils';

export const emailTemplateService = {
  /**
   * Retrieves all email templates, optionally filtered by category
   * @param category Optional category to filter templates
   * @returns Promise<EmailTemplate[]> list of email templates
   */
  async getTemplates(category?: string): Promise<EmailTemplate[]> {
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Map the database records to the EmailTemplate type
      return (data || []).map(template => {
        // Safely convert variables from Json type to EmailTemplateVariable[]
        const variables = parseTemplateVariables(template.variables);
        
        return {
          id: template.id,
          name: template.name,
          subject: template.subject,
          description: template.description || '',
          category: template.category as EmailCategory,
          content: template.content,
          variables: variables,
          created_at: template.created_at,
          updated_at: template.updated_at,
          body: template.content, // For backward compatibility
          is_archived: template.is_archived || false
        };
      });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      return [];
    }
  },

  /**
   * Retrieves a specific email template by ID
   * @param id The template ID to fetch
   * @returns Promise<EmailTemplate | null> the template or null if not found
   */
  async getTemplateById(id: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Safely convert variables from Json type to EmailTemplateVariable[]
      const variables = parseTemplateVariables(data.variables);
      
      // Map the database record to the EmailTemplate type
      return {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: variables,
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  },

  /**
   * Creates a new email template
   * @param template The template data to create
   * @returns Promise<EmailTemplate | null> the created template or null if failed
   */
  async createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
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
      
      // Safely convert variables from Json type to EmailTemplateVariable[]
      const variables = parseTemplateVariables(data.variables);
      
      // Map the database record to the EmailTemplate type
      return {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: variables,
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };
    } catch (error) {
      console.error('Error creating email template:', error);
      return null;
    }
  },

  /**
   * Updates an existing email template
   * @param id The template ID to update
   * @param template The updated template data
   * @returns Promise<EmailTemplate | null> the updated template or null if failed
   */
  async updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
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
      
      // Safely convert variables from Json type to EmailTemplateVariable[]
      const variables = parseTemplateVariables(data.variables);
      
      // Map the database record to the EmailTemplate type
      return {
        id: data.id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        category: data.category as EmailCategory,
        content: data.content,
        variables: variables,
        created_at: data.created_at,
        updated_at: data.updated_at,
        body: data.content, // For backward compatibility
        is_archived: data.is_archived || false
      };
    } catch (error) {
      console.error('Error updating email template:', error);
      return null;
    }
  },

  /**
   * Deletes an email template
   * @param id The template ID to delete
   * @returns Promise<boolean> indicating success or failure
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting email template:', error);
      return false;
    }
  }
};

// Helper function to parse template variables
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
