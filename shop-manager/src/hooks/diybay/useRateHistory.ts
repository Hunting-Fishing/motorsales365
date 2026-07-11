
import { useState } from "react";
import { Bay, RateHistory, fetchRateHistory } from "@/services/diybay/diybayService";

export function useRateHistory() {
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadRateHistory = async (bay: Bay): Promise<void> => {
    setIsLoadingHistory(true);
    try {
      const history = await fetchRateHistory(bay.id);
      setRateHistory(history);
    } catch (error) {
      console.error("Error loading rate history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return { rateHistory, isLoadingHistory, loadRateHistory };
}
