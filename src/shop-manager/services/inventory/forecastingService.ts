import { supabase } from '@/integrations/supabase/client';
import { InventoryForecast } from '@/types/inventory/predictive';

export interface ForecastInput {
  inventoryItemId: string;
  currentStock: number;
  averageConsumptionRate: number;
  usageMetric: string;
}

export interface ForecastResult {
  predictedRunoutDate: string | null;
  predictedRunoutUsage: number | null;
  daysUntilRunout: number | null;
  recommendedReorderDate: string | null;
  recommendedReorderQuantity: number;
  confidenceLevel: number;
}

export async function calculateForecast(input: ForecastInput): Promise<ForecastResult> {
  const { currentStock, averageConsumptionRate } = input;

  // Calculate days until runout
  const daysUntilRunout = averageConsumptionRate > 0 
    ? Math.floor(currentStock / averageConsumptionRate)
    : null;

  // Calculate predicted runout date
  const predictedRunoutDate = daysUntilRunout 
    ? new Date(Date.now() + daysUntilRunout * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Calculate recommended reorder date (when stock reaches 20%)
  const reorderThreshold = currentStock * 0.2;
  const daysUntilReorder = averageConsumptionRate > 0
    ? Math.floor((currentStock - reorderThreshold) / averageConsumptionRate)
    : null;

  const recommendedReorderDate = daysUntilReorder
    ? new Date(Date.now() + daysUntilReorder * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Calculate recommended reorder quantity (enough for 30 days)
  const recommendedReorderQuantity = Math.ceil(averageConsumptionRate * 30);

  // Calculate confidence level based on data availability
  const confidenceLevel = averageConsumptionRate > 0 ? 0.85 : 0.5;

  return {
    predictedRunoutDate,
    predictedRunoutUsage: daysUntilRunout,
    daysUntilRunout,
    recommendedReorderDate,
    recommendedReorderQuantity,
    confidenceLevel
  };
}

export async function saveForecast(
  inventoryItemId: string,
  forecast: ForecastResult,
  currentStock: number,
  averageConsumptionRate: number
): Promise<void> {
  const { error } = await supabase
    .from('inventory_forecasts')
    .upsert({
      inventory_item_id: inventoryItemId,
      forecast_type: 'usage_based',
      predicted_runout_date: forecast.predictedRunoutDate,
      predicted_runout_usage: forecast.predictedRunoutUsage,
      current_stock: currentStock,
      average_consumption_rate: averageConsumptionRate,
      confidence_level: forecast.confidenceLevel,
      recommended_reorder_date: forecast.recommendedReorderDate,
      recommended_reorder_quantity: forecast.recommendedReorderQuantity,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

export async function getInventoryForecasts(): Promise<InventoryForecast[]> {
  const { data, error } = await supabase
    .from('inventory_forecasts')
    .select('*')
    .order('predicted_runout_date', { ascending: true });

  if (error) throw error;
  return data as InventoryForecast[];
}

export async function updateForecastsForAllItems(): Promise<void> {
  // Get all inventory items with consumption history
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('id, quantity');

  if (itemsError) throw itemsError;

  // Get consumption rates
  const { data: rates, error: ratesError } = await supabase
    .from('inventory_consumption_rates')
    .select('*');

  if (ratesError) throw ratesError;

  // Update forecasts for each item with consumption data
  for (const item of items || []) {
    const rate = rates?.find(r => r.inventory_item_id === item.id);
    if (rate && rate.consumption_per_unit > 0) {
      const forecast = await calculateForecast({
        inventoryItemId: item.id,
        currentStock: item.quantity || 0,
        averageConsumptionRate: rate.consumption_per_unit,
        usageMetric: rate.usage_metric
      });

      await saveForecast(
        item.id,
        forecast,
        item.quantity || 0,
        rate.consumption_per_unit
      );
    }
  }
}
