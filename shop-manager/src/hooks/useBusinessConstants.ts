
import { useState, useEffect } from 'react';
import { businessConstantsService, type BusinessConstant } from '@/services/unified/businessConstantsService';

export { type BusinessConstant };

export function useBusinessConstants() {
  const [businessTypes, setBusinessTypes] = useState<BusinessConstant[]>([]);
  const [businessIndustries, setBusinessIndustries] = useState<BusinessConstant[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<BusinessConstant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessConstants = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const constants = await businessConstantsService.getBusinessConstants();
      
      setBusinessTypes(constants.businessTypes);
      setBusinessIndustries(constants.industries);
      setPaymentMethods(constants.paymentMethods);
    } catch (err: any) {
      console.error('Error fetching business constants:', err);
      setError(err.message || 'Failed to load business constants');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomIndustry = async (industryName: string): Promise<string> => {
    try {
      const value = await businessConstantsService.addCustomIndustry(industryName);
      
      // Refresh the constants to include the new industry
      await fetchBusinessConstants();
      
      return value;
    } catch (err: any) {
      console.error('Error adding custom industry:', err);
      throw new Error(err.message || 'Failed to add custom industry');
    }
  };

  useEffect(() => {
    fetchBusinessConstants();
  }, []);

  return { 
    businessTypes, 
    businessIndustries, 
    paymentMethods, 
    isLoading, 
    error, 
    fetchBusinessConstants,
    addCustomIndustry
  };
}
