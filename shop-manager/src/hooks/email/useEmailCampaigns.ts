import { useState } from "react";
import { EmailCampaign } from "@/types/email";
import { useEmailCampaignList } from "./campaign/useEmailCampaignList";
import { useCampaignDetails } from "./campaign/useCampaignDetails";
import { useEmailCampaignActions } from "./campaign/useEmailCampaignActions";
import { useToast } from "@/hooks/use-toast";

export const useEmailCampaigns = () => {
  const [currentCampaign, setCurrentCampaign] = useState<EmailCampaign | null>(null);
  const { toast } = useToast();
  
  // Use our specialized hooks
  const { campaigns, loading: listLoading, fetchCampaigns } = useEmailCampaignList();
  const { campaign, loading: detailsLoading, fetchCampaignDetails } = useCampaignDetails();
  const { 
    processing,
    scheduleCampaign,
    sendCampaignNow,
    pauseCampaign,
    cancelCampaign
  } = useEmailCampaignActions();

  // Combined loading state
  const loading = listLoading || detailsLoading || processing;

  const fetchCampaignById = async (id: string) => {
    const campaign = await fetchCampaignDetails(id);
    if (campaign) {
      setCurrentCampaign(campaign);
    }
    return campaign;
  };

  const createCampaign = async (campaignData: Partial<EmailCampaign>) => {
    try {
      // Use scheduleCampaign from useEmailCampaignActions
      let success = false;
      if (campaignData.id && campaignData.scheduled_at) {
        success = await scheduleCampaign(campaignData.id, campaignData.scheduled_at);
      } else {
        toast({
          title: "Error",
          description: "Missing campaign ID or scheduled date",
          variant: "destructive",
        });
        return null;
      }
      
      if (success) {
        await fetchCampaigns();
        return campaignData;
      }
      return null;
    } catch (error) {
      console.error("Error creating email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to create email campaign",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCampaign = async (id: string, campaignData: Partial<EmailCampaign>) => {
    try {
      // Use pauseCampaign from useEmailCampaignActions
      const success = await pauseCampaign(id);
      
      if (success) {
        // Refetch the campaigns list to get the updated data
        await fetchCampaigns();
        
        // If we have the current campaign loaded and it's the one being updated, update it
        if (currentCampaign && currentCampaign.id === id) {
          setCurrentCampaign({...currentCampaign, ...campaignData});
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error updating email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to update email campaign",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const success = await cancelCampaign(id);
      if (success) {
        await fetchCampaigns();
        if (currentCampaign && currentCampaign.id === id) {
          setCurrentCampaign(null);
        }
      }
      return success;
    } catch (error) {
      console.error("Error deleting email campaign:", error);
      toast({
        title: "Error",
        description: "Failed to delete email campaign",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    campaigns,
    currentCampaign,
    loading,
    fetchCampaigns,
    fetchCampaignById,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    scheduleCampaign,
    sendCampaignNow,
    pauseCampaign,
    cancelCampaign,
  };
};
