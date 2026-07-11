
import { useState } from 'react';
import { EmailCampaignStatus } from '@/types/email';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { validateCampaignStatus } from './utils/emailCampaignUtils';

/**
 * Hook for handling email campaign actions like scheduling, sending, pausing, and cancelling
 */
export const useEmailCampaignActions = () => {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Schedule a campaign for future delivery
   */
  const scheduleCampaign = async (id: string, date: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ 
          status: 'scheduled' as EmailCampaignStatus,
          scheduled_date: date 
        })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Email campaign scheduled successfully",
      });
      return true;
    } catch (error) {
      console.error("Error scheduling email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to schedule email campaign",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Send a campaign immediately
   */
  const sendCampaignNow = async (id: string) => {
    setProcessing(true);
    try {
      // Call Supabase Edge Function to trigger the campaign
      const { data, error } = await supabase.functions.invoke('trigger-email-campaign', {
        body: { campaignId: id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Email campaign started successfully",
      });
      return true;
    } catch (error) {
      console.error("Error sending email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to send email campaign",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Pause an in-progress campaign
   */
  const pauseCampaign = async (id: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ 
          status: 'paused' as EmailCampaignStatus 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Email campaign paused successfully",
      });
      return true;
    } catch (error) {
      console.error("Error pausing email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to pause email campaign",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Cancel a campaign
   */
  const cancelCampaign = async (id: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ 
          status: 'cancelled' as EmailCampaignStatus 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Email campaign cancelled successfully",
      });
      return true;
    } catch (error) {
      console.error("Error cancelling email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to cancel email campaign",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    scheduleCampaign,
    sendCampaignNow,
    pauseCampaign,
    cancelCampaign
  };
};
