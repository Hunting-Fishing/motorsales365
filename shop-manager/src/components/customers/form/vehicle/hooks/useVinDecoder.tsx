
import { useState } from 'react';
import { VinDecodeResult } from '@/types/vehicle';
import { decodeVin, getVinValidationError } from '@/services/vinDecoderService';

export interface UseVinDecoderReturn {
  decode: (vin: string) => Promise<VinDecodeResult | null>;
  isDecoding: boolean;
  error: string | null;
  canRetry: boolean;
  hasAttempted: boolean;
  retry: () => void;
}

export const useVinDecoder = (): UseVinDecoderReturn => {
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [lastVin, setLastVin] = useState<string>('');

  const decodeVinInternal = async (vin: string): Promise<VinDecodeResult | null> => {
    // Validate VIN format first
    const validationError = getVinValidationError(vin);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setIsDecoding(true);
    setError(null);
    setHasAttempted(true);
    setLastVin(vin);

    try {
      console.log('Starting VIN decode process for:', vin);
      
      const result = await decodeVin(vin);
      
      if (result) {
        console.log('VIN decode successful:', result);
        setError(null);
        return result;
      } else {
        // Don't treat this as an error since our service now always returns a result
        console.log('VIN decode returned null result');
        setError('Unable to decode VIN - please enter vehicle details manually');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'VIN decode failed';
      console.error('VIN decode error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsDecoding(false);
    }
  };

  const retry = () => {
    if (lastVin) {
      decodeVinInternal(lastVin);
    }
  };

  return {
    decode: decodeVinInternal,
    isDecoding,
    error,
    canRetry: !!error && !!lastVin,
    hasAttempted,
    retry
  };
};
