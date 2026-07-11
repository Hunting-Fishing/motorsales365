
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { getServiceCounts } from '@/lib/services';

export const useServiceData = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { sectors, refetch } = useServiceSectors();
  const { toast } = useToast();

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing live service data...');
      await refetch();
      
      // Get current counts for verification from live database
      const counts = await getServiceCounts();
      console.log('Current live service counts:', counts);
      
      toast({
        title: "Live Data Refreshed",
        description: "Service hierarchy data has been refreshed successfully from live database.",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error refreshing live data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh live data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, toast]);

  return {
    sectors,
    isRefreshing,
    refreshData
  };
};
