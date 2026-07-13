
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { clearAllServiceData } from '@/lib/services';
import { useServiceData } from './useServiceData';

export const useServiceDatabase = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { refreshData } = useServiceData();
  const { toast } = useToast();

  const clearDatabase = async () => {
    setIsClearing(true);
    
    try {
      console.log('Starting live database clear operation...');
      await clearAllServiceData();
      
      // Refresh the live data after clearing
      await refreshData();
      
      toast({
        title: "Live Database Cleared",
        description: "All service data has been successfully removed from live database.",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error clearing live database:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear live database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return {
    isClearing,
    clearDatabase
  };
};
