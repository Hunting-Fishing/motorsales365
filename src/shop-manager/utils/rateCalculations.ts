
import { RateSettings } from "@/services/diybay/diybayService";

/**
 * Calculate daily rate based on hourly rate and settings
 */
export function calculateDailyRate(hourlyRate: number, settings: RateSettings): number {
  // Convert any string values to numbers for calculation
  const dailyHours = typeof settings.daily_hours === 'string' ? parseFloat(settings.daily_hours) : Number(settings.daily_hours);
  const discountPercent = typeof settings.daily_discount_percent === 'string' ? parseFloat(settings.daily_discount_percent) : Number(settings.daily_discount_percent);
  
  const dailyRate = hourlyRate * dailyHours;
  const discount = dailyRate * (discountPercent / 100);
  return parseFloat((dailyRate - discount).toFixed(2));
}

/**
 * Calculate weekly rate based on hourly rate and settings
 */
export function calculateWeeklyRate(hourlyRate: number, settings: RateSettings): number {
  // Convert string to number if needed
  const weeklyMultiplier = typeof settings.weekly_multiplier === 'string' ? parseFloat(settings.weekly_multiplier) : Number(settings.weekly_multiplier);
  return parseFloat((hourlyRate * weeklyMultiplier).toFixed(2));
}

/**
 * Calculate monthly rate based on hourly rate and settings
 */
export function calculateMonthlyRate(hourlyRate: number, settings: RateSettings): number {
  // Convert string to number if needed
  const monthlyMultiplier = typeof settings.monthly_multiplier === 'string' ? parseFloat(settings.monthly_multiplier) : Number(settings.monthly_multiplier);
  return parseFloat((hourlyRate * monthlyMultiplier).toFixed(2));
}

/**
 * Apply percentage adjustment to a rate
 */
export function applyPercentageAdjustment(rate: number, percentage: number): number {
  const adjustment = rate * (percentage / 100);
  return parseFloat((rate + adjustment).toFixed(2));
}

/**
 * Format currency value
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return "$0.00";
  return `$${value.toFixed(2)}`;
}
