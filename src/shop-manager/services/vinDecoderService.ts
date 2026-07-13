
import { VinDecodeResult } from '@/types/vehicle';
import { supabase } from '@/integrations/supabase/client';
import { validateVin, getVinValidationError } from './vinDecoder/vinValidator';
import { performFallbackVinAnalysis } from './vinDecoder/fallbackAnalysis';

/**
 * Main VIN decoding service using Supabase Edge Function with enhanced fallback
 */
export const decodeVin = async (vin: string): Promise<VinDecodeResult | null> => {
  // Validate VIN format
  const validationError = getVinValidationError(vin);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    console.log('Calling VIN decode Edge Function for:', vin);
    
    // Use Supabase Edge Function to decode VIN (bypasses CORS)
    const { data, error } = await supabase.functions.invoke('decode-vin', {
      body: { vin }
    });

    if (error) {
      console.error('Edge Function error:', error);
      
      // If the Edge Function fails, try our local fallback analysis
      console.log('Edge Function failed, using local fallback analysis');
      const fallbackResult = performFallbackVinAnalysis(vin);
      console.log('Local fallback result:', fallbackResult);
      return fallbackResult;
    }

    if (data && typeof data === 'object') {
      console.log('VIN decode successful via Edge Function:', data);
      
      // If Edge Function returns an error object, use fallback
      if (data.error) {
        console.log('Edge Function returned error, using fallback:', data.error);
        return performFallbackVinAnalysis(vin);
      }
      
      return data as VinDecodeResult;
    }

    // If no data returned, use fallback
    console.log('No data returned from Edge Function, using fallback');
    return performFallbackVinAnalysis(vin);

  } catch (error) {
    console.error('VIN decode service error:', error);
    
    // Always provide fallback analysis instead of throwing error
    console.log('Service error, providing fallback analysis');
    return performFallbackVinAnalysis(vin);
  }
};

// Re-export validation utilities for convenience
export { validateVin, formatVin, getVinValidationError } from './vinDecoder/vinValidator';
