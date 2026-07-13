
import { useState, useEffect } from 'react';
import { EmailCampaignPreview } from '@/types/email';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { validateCampaignStatus } from './utils/emailCampaignUtils';

export const useEmailCampaignList = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaignPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Fetch all email campaigns
   */
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCampaigns: EmailCampaignPreview[] = data.map(item => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        status: validateCampaignStatus(item.status),
        scheduled_at: item.scheduled_date,
        scheduledAt: item.scheduled_date,
        sent_at: item.sent_date,
        sentAt: item.sent_date,
        created_at: item.created_at,
        createdAt: item.created_at,
        updated_at: item.updated_at,
        updatedAt: item.updated_at,
        total_recipients: item.total_recipients || 0,
        totalRecipients: item.total_recipients || 0,
        opened: item.opened || 0,
        clicked: item.clicked || 0,
        has_ab_test: !!item.ab_test
      }));

      setCampaigns(formattedCampaigns);
      return formattedCampaigns;
    } catch (error) {
      console.error("Error fetching email campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to load email campaigns",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load campaigns on initial mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  return { campaigns, loading, fetchCampaigns };
};
