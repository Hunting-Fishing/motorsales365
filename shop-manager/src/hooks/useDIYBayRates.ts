
import { useDIYBayState } from './diybay/useDIYBayState';
import { useDIYBayOperations } from './diybay/useDIYBayOperations';
import { useRateHistory } from './diybay/useRateHistory';
import { useRateSettings } from './diybay/useRateSettings';
import { useRateCalculation } from './diybay/useRateCalculation';
import { RateSettings } from '@/services/diybay/diybayService';

/**
 * Main hook for DIY bay rates management
 * This combines all the specialized hooks into one cohesive API
 */
export function useDIYBayRates() {
  // Get state management
  const { 
    bays, 
    setBays, 
    settings, 
    setSettings, 
    isLoading, 
    isSaving, 
    setIsSaving, 
    loadData 
  } = useDIYBayState();

  // Get CRUD operations
  const { 
    addBay, 
    saveBay, 
    removeBay 
  } = useDIYBayOperations(bays, setBays, setIsSaving);

  // Get rate history management
  const { 
    rateHistory, 
    loadRateHistory 
  } = useRateHistory();

  // Get rate settings management
  const { 
    updateBayRateSettings 
  } = useRateSettings(settings, setSettings, bays, setBays, setIsSaving);

  // Get rate calculation utilities
  const { 
    calculateRate 
  } = useRateCalculation();

  // Wrapper for calculate rate that uses the current settings
  const calculateRateWithCurrentSettings = (type: 'daily' | 'weekly' | 'monthly', hourlyRate: number) => {
    return calculateRate(type, hourlyRate, settings);
  };

  return {
    // State
    bays,
    setBays, // Expose setBays for the drag and drop functionality
    settings,
    isLoading,
    isSaving,
    rateHistory,
    
    // Operations
    loadData,
    addBay,
    saveBay,
    removeBay,
    loadRateHistory,
    updateBayRateSettings,
    calculateRate: calculateRateWithCurrentSettings,
  };
}
