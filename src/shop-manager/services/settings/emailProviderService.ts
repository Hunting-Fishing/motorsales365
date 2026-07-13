
import { supabase } from "@/lib/supabase";
import { EmailProviderSettings } from "@/types/settings";

export const emailProviderService = {
  async getEmailProviderSettings(shopId: string): Promise<EmailProviderSettings | null> {
    try {
      const { data, error } = await supabase
        .from("email_provider_settings")
        .select("*")
        .eq("shop_id", shopId)
        .single();

      if (error) {
        console.error("Error fetching email provider settings:", error);
        return null;
      }

      return {
        ...data,
        provider: data.provider as 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'other'
      };
    } catch (error) {
      console.error("Failed to fetch email provider settings:", error);
      return null;
    }
  },

  async createEmailProviderSettings(settings: Partial<EmailProviderSettings>): Promise<EmailProviderSettings | null> {
    try {
      const completeSettings = {
        provider: settings.provider || 'smtp',
        shop_id: settings.shop_id,
        from_email: settings.from_email || '',
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || 587,
        smtp_username: settings.smtp_username || '',
        smtp_password: settings.smtp_password || '',
        api_key: settings.api_key || '',
        is_enabled: settings.is_enabled ?? false
      };

      const { data, error } = await supabase
        .from("email_provider_settings")
        .insert(completeSettings)
        .select()
        .single();

      if (error) {
        console.error("Error creating email provider settings:", error);
        return null;
      }

      return {
        ...data,
        provider: data.provider as 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'other'
      };
    } catch (error) {
      console.error("Failed to create email provider settings:", error);
      return null;
    }
  },

  async updateEmailProviderSettings(id: string, settings: Partial<EmailProviderSettings>): Promise<EmailProviderSettings | null> {
    try {
      const { data, error } = await supabase
        .from("email_provider_settings")
        .update(settings)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating email provider settings:", error);
        return null;
      }

      return {
        ...data,
        provider: data.provider as 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'other'
      };
    } catch (error) {
      console.error("Failed to update email provider settings:", error);
      return null;
    }
  },

  async testEmailConnection(settings: EmailProviderSettings): Promise<{ success: boolean; message: string }> {
    try {
      // Validate required fields based on provider
      if (settings.provider === 'smtp') {
        if (!settings.smtp_host || !settings.smtp_port) {
          return { success: false, message: 'SMTP host and port are required' };
        }
        if (!settings.smtp_username || !settings.smtp_password) {
          return { success: false, message: 'SMTP credentials are required' };
        }
      } else if (['sendgrid', 'mailgun', 'ses'].includes(settings.provider)) {
        if (!settings.api_key) {
          return { success: false, message: 'API key is required for this provider' };
        }
      }

      if (!settings.from_email) {
        return { success: false, message: 'From email address is required' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.from_email)) {
        return { success: false, message: 'Invalid from email address format' };
      }

      // In production, this would call an edge function to actually test the connection
      // For now, we perform validation and return success if all fields are valid
      
      // Simulate a brief delay as if testing connection
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if we can at least verify the settings are saved
      if (settings.id) {
        const { data, error } = await supabase
          .from("email_provider_settings")
          .select("id")
          .eq("id", settings.id)
          .single();

        if (error || !data) {
          return { success: false, message: 'Settings not found in database' };
        }
      }

      return { 
        success: true, 
        message: `Configuration validated for ${settings.provider.toUpperCase()}. Note: Full connection test requires an edge function.` 
      };
    } catch (error) {
      console.error("Failed to test email connection:", error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
};
