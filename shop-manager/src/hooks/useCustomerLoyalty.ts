
import { useState, useEffect } from 'react';
import { CustomerLoyalty } from '@/types/loyalty';
import { getCustomerLoyalty, ensureCustomerLoyalty } from '@/services/loyalty/customerLoyaltyService';
import { useToast } from '@/hooks/use-toast';

export const useCustomerLoyalty = (customerId: string | undefined) => {
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyalty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomerLoyalty = async () => {
      if (!customerId || customerId === "undefined") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use ensureCustomerLoyalty to guarantee a loyalty record exists
        const loyaltyData = await ensureCustomerLoyalty(customerId);
        setCustomerLoyalty(loyaltyData);
        
      } catch (err) {
        console.error('Error fetching customer loyalty:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load loyalty data';
        setError(errorMessage);
        
        toast({
          title: "Error",
          description: "Failed to load loyalty information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerLoyalty();
  }, [customerId, toast]);

  const refreshLoyalty = async () => {
    if (!customerId) return;
    
    try {
      const loyaltyData = await getCustomerLoyalty(customerId);
      setCustomerLoyalty(loyaltyData);
    } catch (err) {
      console.error('Error refreshing loyalty data:', err);
    }
  };

  return {
    customerLoyalty,
    loading,
    error,
    refreshLoyalty
  };
};
