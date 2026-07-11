import { useState, useEffect, useCallback } from 'react';
import { CarMake, CarModel } from '@/types/vehicle';
import { fetchMakes, fetchModels as fetchVehicleModels } from '@/services/vehicleDataService';

export const useVehicleData = () => {
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [makesError, setMakesError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Fetch makes on mount
  useEffect(() => {
    const loadMakes = async () => {
      setIsLoadingMakes(true);
      setMakesError(null);
      
      try {
        console.log('🎯 useVehicleData: Loading vehicle makes...');
        const fetchedMakes = await fetchMakes();
        console.log('🎯 useVehicleData: Vehicle makes loaded:', {
          count: fetchedMakes.length,
          makes: fetchedMakes.slice(0, 3).map(m => m.make_display) // Show first 3 for debugging
        });
        
        if (fetchedMakes.length === 0) {
          console.warn('⚠️ useVehicleData: No vehicle makes found in database');
          setMakesError('No vehicle makes found in database');
        }
        
        setMakes(fetchedMakes);
      } catch (error) {
        console.error('❌ useVehicleData: Error loading makes:', error);
        setMakesError(error instanceof Error ? error.message : 'Failed to load makes');
      } finally {
        setIsLoadingMakes(false);
      }
    };

    loadMakes();
  }, []);

  // Fetch models for a specific make
  const fetchModels = useCallback(async (makeId: string) => {
    if (!makeId) {
      console.log('🎯 useVehicleData: No makeId provided, clearing models');
      setModels([]);
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);
    
    try {
      console.log('🎯 useVehicleData: Loading models for make:', makeId);
      const fetchedModels = await fetchVehicleModels(makeId);
      console.log('🎯 useVehicleData: Models loaded:', {
        count: fetchedModels.length,
        models: fetchedModels.slice(0, 3).map(m => m.model_display) // Show first 3 for debugging
      });
      
      if (fetchedModels.length === 0) {
        console.warn(`⚠️ useVehicleData: No models found for make: ${makeId}`);
        setModelsError(`No models found for make: ${makeId}`);
      }
      
      setModels(fetchedModels);
    } catch (error) {
      console.error('❌ useVehicleData: Error loading models:', error);
      setModelsError(error instanceof Error ? error.message : 'Failed to load models');
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  return {
    makes,
    models,
    isLoadingMakes,
    isLoadingModels,
    makesError,
    modelsError,
    fetchModels
  };
};