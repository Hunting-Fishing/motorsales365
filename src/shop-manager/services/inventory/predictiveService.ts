import { supabase } from '@/integrations/supabase/client';
import {
  ServicePackage,
  ServicePackageItem,
  ConsumptionRate,
  ConsumptionHistory,
  InventoryForecast,
  AssetUsageConfig,
  SeasonalFactor,
} from '@/types/inventory/predictive';

// Service Package Management
export const getServicePackages = async (): Promise<ServicePackage[]> => {
  const { data, error } = await supabase
    .from('service_packages')
    .select(`
      *,
      items:service_package_items(*)
    `)
    .order('name');

  if (error) throw error;
  return (data || []) as ServicePackage[];
};

export const getServicePackageById = async (id: string): Promise<ServicePackage | null> => {
  const { data, error } = await supabase
    .from('service_packages')
    .select(`
      *,
      items:service_package_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ServicePackage | null;
};

export const createServicePackage = async (
  packageData: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at' | 'items'>
): Promise<ServicePackage> => {
  const { data, error } = await supabase
    .from('service_packages')
    .insert(packageData)
    .select()
    .single();

  if (error) throw error;
  return data as ServicePackage;
};

export const updateServicePackage = async (
  id: string,
  packageData: Partial<ServicePackage>
): Promise<ServicePackage> => {
  const { data, error } = await supabase
    .from('service_packages')
    .update(packageData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ServicePackage;
};

export const deleteServicePackage = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('service_packages')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Service Package Items
export const addItemToServicePackage = async (
  item: Omit<ServicePackageItem, 'id' | 'created_at'>
): Promise<ServicePackageItem> => {
  const { data, error } = await supabase
    .from('service_package_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeItemFromServicePackage = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('service_package_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
};

export const updateServicePackageItem = async (
  itemId: string,
  updates: Partial<ServicePackageItem>
): Promise<ServicePackageItem> => {
  const { data, error } = await supabase
    .from('service_package_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Consumption Rates
export const getConsumptionRates = async (inventoryItemId?: string): Promise<ConsumptionRate[]> => {
  let query = supabase
    .from('inventory_consumption_rates')
    .select('*')
    .order('created_at', { ascending: false });

  if (inventoryItemId) {
    query = query.eq('inventory_item_id', inventoryItemId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ConsumptionRate[];
};

export const createConsumptionRate = async (
  rate: Omit<ConsumptionRate, 'id' | 'created_at' | 'updated_at'>
): Promise<ConsumptionRate> => {
  const { data, error } = await supabase
    .from('inventory_consumption_rates')
    .insert(rate)
    .select()
    .single();

  if (error) throw error;
  return data as ConsumptionRate;
};

export const updateConsumptionRate = async (
  id: string,
  updates: Partial<ConsumptionRate>
): Promise<ConsumptionRate> => {
  const { data, error } = await supabase
    .from('inventory_consumption_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ConsumptionRate;
};

// Consumption History
export const addConsumptionHistory = async (
  history: Omit<ConsumptionHistory, 'id'>
): Promise<ConsumptionHistory> => {
  const { data, error } = await supabase
    .from('inventory_consumption_history')
    .insert(history)
    .select()
    .single();

  if (error) throw error;
  return data as ConsumptionHistory;
};

export const getConsumptionHistory = async (
  inventoryItemId: string,
  limit = 100
): Promise<ConsumptionHistory[]> => {
  const { data, error } = await supabase
    .from('inventory_consumption_history')
    .select('*')
    .eq('inventory_item_id', inventoryItemId)
    .order('consumed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ConsumptionHistory[];
};

// Forecasting
export const getInventoryForecasts = async (): Promise<InventoryForecast[]> => {
  const { data, error } = await supabase
    .from('inventory_forecasts')
    .select('*')
    .order('predicted_runout_date');

  if (error) throw error;
  return (data || []) as InventoryForecast[];
};

export const getForecastForItem = async (inventoryItemId: string): Promise<InventoryForecast | null> => {
  const { data, error } = await supabase
    .from('inventory_forecasts')
    .select('*')
    .eq('inventory_item_id', inventoryItemId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as InventoryForecast | null;
};

export const createOrUpdateForecast = async (
  forecast: Omit<InventoryForecast, 'id' | 'created_at' | 'updated_at'>
): Promise<InventoryForecast> => {
  // Check if forecast exists
  const existing = await getForecastForItem(forecast.inventory_item_id);

  if (existing) {
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .update(forecast)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as InventoryForecast;
  } else {
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .insert(forecast)
      .select()
      .single();

    if (error) throw error;
    return data as InventoryForecast;
  }
};

// Asset Usage Configuration
export const getAssetUsageConfig = async (
  assetId: string,
  assetType: string
): Promise<AssetUsageConfig | null> => {
  const { data, error } = await supabase
    .from('asset_usage_config')
    .select('*')
    .eq('asset_id', assetId)
    .eq('asset_type', assetType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as AssetUsageConfig | null;
};

export const createOrUpdateAssetUsage = async (
  config: Omit<AssetUsageConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<AssetUsageConfig> => {
  const existing = await getAssetUsageConfig(config.asset_id, config.asset_type);

  if (existing) {
    const { data, error } = await supabase
      .from('asset_usage_config')
      .update(config)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as AssetUsageConfig;
  } else {
    const { data, error } = await supabase
      .from('asset_usage_config')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data as AssetUsageConfig;
  }
};

// Seasonal Factors
export const getSeasonalFactors = async (): Promise<SeasonalFactor[]> => {
  const { data, error } = await supabase
    .from('inventory_seasonal_factors')
    .select('*')
    .order('month');

  if (error) throw error;
  return data || [];
};

export const createSeasonalFactor = async (
  factor: Omit<SeasonalFactor, 'id' | 'created_at'>
): Promise<SeasonalFactor> => {
  const { data, error } = await supabase
    .from('inventory_seasonal_factors')
    .insert(factor)
    .select()
    .single();

  if (error) throw error;
  return data;
};
