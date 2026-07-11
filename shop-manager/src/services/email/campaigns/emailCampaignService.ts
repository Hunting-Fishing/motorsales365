
import { supabase } from '@/lib/supabase';
import { EmailCampaign, EmailABTest, EmailCampaignStatus } from '@/types/email';
import { GenericResponse, parseJsonField, prepareForSupabase } from '../utils/supabaseHelper';

// Helper function to convert database campaign to typed EmailCampaign
const mapDbCampaignToEmailCampaign = (campaign: any): EmailCampaign => {
  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    body: campaign.content || '',  // Use content as body
    content: campaign.content,
    status: campaign.status as EmailCampaignStatus,
    template_id: campaign.template_id,
    templateId: campaign.template_id,
    segment_id: campaign.segment_id,
    segmentId: campaign.segment_id,
    segment_ids: parseJsonField<string[]>(campaign.segment_ids, []),
    segmentIds: parseJsonField<string[]>(campaign.segment_ids, []),
    recipient_ids: parseJsonField<string[]>(campaign.recipient_ids, []),
    recipientIds: parseJsonField<string[]>(campaign.recipient_ids, []),
    scheduled_at: campaign.scheduled_at,
    scheduledAt: campaign.scheduled_at,
    sent_at: campaign.sent_at,
    sentAt: campaign.sent_at,
    created_at: campaign.created_at,
    createdAt: campaign.created_at,
    updated_at: campaign.updated_at,
    updatedAt: campaign.updated_at,
    personalizations: parseJsonField(campaign.personalizations, {}),
    metadata: parseJsonField(campaign.metadata, {}),
    ab_test: parseJsonField(campaign.ab_test, null),
    abTest: parseJsonField(campaign.ab_test, null),
    totalRecipients: campaign.total_recipients || 0,
    total_recipients: campaign.total_recipients || 0,
    opened: campaign.opened || 0,
    clicked: campaign.clicked || 0,
    bounced: campaign.bounced || 0,
    complained: campaign.complained || 0,
    unsubscribed: campaign.unsubscribed || 0
  };
};

/**
 * Service for managing email campaigns
 */
export const emailCampaignService = {
  /**
   * Get all email campaigns
   */
  async getCampaigns(): Promise<GenericResponse<EmailCampaign[]>> {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map data to EmailCampaign type, ensuring all required fields are present
      const campaigns: EmailCampaign[] = data.map(campaign => mapDbCampaignToEmailCampaign(campaign));

      return { data: campaigns, error: null };
    } catch (error) {
      console.error('Error getting email campaigns:', error);
      return { data: null, error };
    }
  },

  /**
   * Get a campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<GenericResponse<EmailCampaign>> {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      // Convert to EmailCampaign type
      const campaign: EmailCampaign = mapDbCampaignToEmailCampaign(data);

      return { data: campaign, error: null };
    } catch (error) {
      console.error(`Error getting email campaign ${campaignId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Create a new email campaign
   */
  async createCampaign(campaign: Partial<EmailCampaign>): Promise<GenericResponse<EmailCampaign>> {
    try {
      // Convert the AB test object to a serializable format
      const abTestData = campaign.abTest || campaign.ab_test;
      const supabaseAbTest = abTestData ? prepareForSupabase(abTestData) : undefined;

      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          name: campaign.name,
          subject: campaign.subject,
          content: campaign.content || campaign.body,
          status: 'draft',
          template_id: campaign.template_id || campaign.templateId,
          segment_ids: campaign.segment_ids || campaign.segmentIds || [],
          recipient_ids: campaign.recipient_ids || campaign.recipientIds || [],
          personalizations: campaign.personalizations || {},
          metadata: campaign.metadata || {},
          ab_test: supabaseAbTest
        })
        .select()
        .single();
    
      if (error) throw error;

      // Convert to EmailCampaign type
      const newCampaign: EmailCampaign = mapDbCampaignToEmailCampaign(data);

      return { data: newCampaign, error: null };
    } catch (error) {
      console.error('Error creating email campaign:', error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing email campaign
   */
  async updateCampaign(
    campaignId: string,
    campaign: Partial<EmailCampaign>
  ): Promise<GenericResponse<EmailCampaign>> {
    try {
      // Prepare ab_test data
      const abTestData = campaign.abTest || campaign.ab_test;
      const supabaseAbTest = abTestData ? prepareForSupabase(abTestData) : undefined;

      const { data, error } = await supabase
        .from('email_campaigns')
        .update({
          name: campaign.name,
          subject: campaign.subject,
          content: campaign.content || campaign.body,
          status: campaign.status,
          template_id: campaign.template_id || campaign.templateId,
          segment_ids: campaign.segment_ids || campaign.segmentIds,
          recipient_ids: campaign.recipient_ids || campaign.recipientIds,
          personalizations: campaign.personalizations,
          metadata: campaign.metadata,
          ab_test: supabaseAbTest
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      // Convert to EmailCampaign type
      const updatedCampaign: EmailCampaign = mapDbCampaignToEmailCampaign(data);

      return { data: updatedCampaign, error: null };
    } catch (error) {
      console.error(`Error updating email campaign ${campaignId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Delete an email campaign
   */
  async deleteCampaign(campaignId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error) {
      console.error(`Error deleting email campaign ${campaignId}:`, error);
      return { data: false, error };
    }
  },

  /**
   * Create a new A/B testing campaign variant
   * @param campaignId Campaign ID
   * @param abTest A/B testing configuration
   * @returns Success status
   */
  async createABTestVariant(
    campaignId: string, 
    abTest: EmailABTest
  ): Promise<GenericResponse<{ success: boolean }>> {
    try {
      // Convert EmailABTest to raw JSON before storing
      const abTestJson = prepareForSupabase(abTest);
      
      const { error } = await supabase
        .from('email_campaigns')
        .update({
          ab_test: abTestJson
        })
        .eq('id', campaignId);
      
      if (error) throw error;
      
      return { 
        data: { success: true }, 
        error: null 
      };
    } catch (error) {
      console.error('Error creating A/B test variant:', error);
      return { 
        data: { success: false }, 
        error 
      };
    }
  }
};
