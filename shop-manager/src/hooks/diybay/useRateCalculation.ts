
import { RateSettings, calculateRates } from "@/services/diybay/diybayService";

export function useRateCalculation() {
  const calculateRate = (
    type: 'daily' | 'weekly' | 'monthly', 
    hourlyRate: number, 
    settings: RateSettings
  ): number => {
    const rates = calculateRates(hourlyRate, settings);
    return rates[type];
  };

  return { calculateRate };
}
