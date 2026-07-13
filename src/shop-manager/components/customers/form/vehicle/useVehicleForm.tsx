
import { useState, useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CarMake, CarModel, VinDecodeResult } from '@/types/vehicle';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useVinDecoder } from './hooks/useVinDecoder';

interface UseVehicleFormProps {
  form: UseFormReturn<any>;
  index: number;
}

export const useVehicleForm = ({ form, index }: UseVehicleFormProps) => {
  const { makes, models, fetchModels, isLoadingMakes, makesError } = useVehicleData();
  const [decodedVehicleInfo, setDecodedVehicleInfo] = useState<VinDecodeResult | null>(null);
  
  const { 
    isProcessing: vinProcessing, 
    error: vinError, 
    canRetry,
    decode: decodeVin,
    retry: retryVinDecode 
  } = useVinDecoder();

  // Helper function to find matching make
  const findMatchingMake = useCallback((decodedMake: string): CarMake | null => {
    if (!decodedMake || !makes?.length) return null;
    
    const normalizedDecodedMake = decodedMake.toLowerCase().trim();
    console.log('Looking for make match for:', normalizedDecodedMake, 'in makes:', makes);
    
    // Try exact match on make_display first
    let match = makes.find(make => 
      make.make_display?.toLowerCase() === normalizedDecodedMake
    );
    
    if (match) {
      console.log('Found exact display match:', match);
      return match;
    }
    
    // Try exact match on make_id
    match = makes.find(make => 
      make.make_id?.toLowerCase() === normalizedDecodedMake
    );
    
    if (match) {
      console.log('Found exact ID match:', match);
      return match;
    }
    
    // Try partial match on make_display
    match = makes.find(make => 
      make.make_display?.toLowerCase().includes(normalizedDecodedMake) ||
      normalizedDecodedMake.includes(make.make_display?.toLowerCase() || '')
    );
    
    if (match) {
      console.log('Found partial display match:', match);
      return match;
    }
    
    // Try partial match on make_id
    match = makes.find(make => 
      make.make_id?.toLowerCase().includes(normalizedDecodedMake) ||
      normalizedDecodedMake.includes(make.make_id?.toLowerCase() || '')
    );
    
    if (match) {
      console.log('Found partial ID match:', match);
      return match;
    }
    
    console.log('No make match found for:', decodedMake);
    return null;
  }, [makes]);

  // Helper function to find matching model
  const findMatchingModel = useCallback((decodedModel: string, makeId: string): CarModel | null => {
    if (!decodedModel || !models?.length) return null;
    
    const normalizedDecodedModel = decodedModel.toLowerCase().trim();
    console.log('Looking for model match for:', normalizedDecodedModel, 'in models:', models);
    
    // Filter models for the specific make first
    const modelsForMake = models.filter(model => model.model_make_id === makeId);
    console.log('Models for make:', makeId, modelsForMake);
    
    if (modelsForMake.length === 0) return null;
    
    // Try exact match first
    let match = modelsForMake.find(model => 
      model.model_name?.toLowerCase() === normalizedDecodedModel
    );
    
    if (match) {
      console.log('Found exact model match:', match);
      return match;
    }
    
    // Try partial match
    match = modelsForMake.find(model => 
      model.model_name?.toLowerCase().includes(normalizedDecodedModel) ||
      normalizedDecodedModel.includes(model.model_name?.toLowerCase() || '')
    );
    
    if (match) {
      console.log('Found partial model match:', match);
      return match;
    }
    
    console.log('No model match found for:', decodedModel);
    return null;
  }, [models]);

  // Handle VIN decode success
  const handleVinDecodeSuccess = useCallback(async (result: VinDecodeResult) => {
    console.log('Handling VIN decode success:', result);
    setDecodedVehicleInfo(result);
    
    // Populate basic fields immediately
    if (result.year) {
      form.setValue(`vehicles.${index}.year`, result.year.toString());
      console.log('Set year to:', result.year);
    }
    
    // Handle make matching and population
    if (result.make && makes?.length > 0) {
      const matchingMake = findMatchingMake(result.make);
      
      if (matchingMake) {
        console.log('Setting make to:', matchingMake.make_id);
        form.setValue(`vehicles.${index}.make`, matchingMake.make_id);
        
        // Fetch models for this make
        try {
          await fetchModels(matchingMake.make_id);
          console.log('Models fetched for make:', matchingMake.make_id);
          
          // Small delay to ensure models are loaded
          setTimeout(() => {
            if (result.model) {
              const matchingModel = findMatchingModel(result.model, matchingMake.make_id);
              if (matchingModel) {
                console.log('Setting model to:', matchingModel.model_name);
                form.setValue(`vehicles.${index}.model`, matchingModel.model_name);
              } else {
                console.log('No matching model found, setting original model name:', result.model);
                form.setValue(`vehicles.${index}.model`, result.model);
              }
            }
          }, 100);
        } catch (error) {
          console.error('Error fetching models:', error);
        }
      } else {
        console.log('No matching make found, setting original make name:', result.make);
        form.setValue(`vehicles.${index}.make`, result.make);
        
        // Still try to set the model if available
        if (result.model) {
          form.setValue(`vehicles.${index}.model`, result.model);
        }
      }
    }
    
    // Trigger form validation
    form.trigger(`vehicles.${index}`);
  }, [form, index, makes, findMatchingMake, findMatchingModel, fetchModels]);

  // Handle VIN decode error
  const handleVinDecodeError = useCallback((error: string) => {
    console.error('VIN decode error:', error);
    setDecodedVehicleInfo(null);
  }, []);

  // VIN decode function
  const handleVinDecode = useCallback(async (vin: string) => {
    if (!vin || vin.length !== 17) return;
    
    console.log('Starting VIN decode for:', vin);
    await decodeVin(vin, handleVinDecodeSuccess, handleVinDecodeError);
  }, [decodeVin, handleVinDecodeSuccess, handleVinDecodeError]);

  // Retry VIN decode
  const onVinRetry = useCallback(() => {
    const currentVin = form.getValues(`vehicles.${index}.vin`);
    if (currentVin && canRetry) {
      retryVinDecode(currentVin, handleVinDecodeSuccess, handleVinDecodeError);
    }
  }, [form, index, canRetry, retryVinDecode, handleVinDecodeSuccess, handleVinDecodeError]);

  return {
    makes,
    models,
    vinProcessing,
    vinError,
    canRetry,
    decodedVehicleInfo,
    fetchModels,
    handleVinDecode,
    onVinRetry,
    isLoadingMakes,
    makesError,
    hasAttempted: false // Add this for compatibility
  };
};
