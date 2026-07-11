
import { Bay as BaseBay, RateSettings } from "@/services/diybay/diybayService";

export type BayViewMode = "table" | "cards" | "compact";

export interface BayDetails extends BaseBay {
  // Any additional properties specific to the UI representation
}

export interface RateMode {
  type: 'default' | 'custom' | 'percentage';
  percentage?: number;
}

export interface BayRates {
  hourly: number;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}
