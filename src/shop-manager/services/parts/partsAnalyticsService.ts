import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface PartsAnalytics {
  totalPartsUsed: number;
  totalPartsUsedChange: number;
  partsRevenue: number;
  partsRevenueChange: number;
  averageMarkup: number;
  averageMarkupChange: number;
  partsROI: number;
  partsROIChange: number;
}

export interface PartsRevenueBreakdown {
  monthlyRevenue: number;
  profitMargin: number;
  topCategory: string;
  topCategoryRevenue: number;
}

export async function getPartsAnalytics(): Promise<PartsAnalytics> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) {
      return getDefaultAnalytics();
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Get current month transactions by joining with inventory_items
    const { data: currentTransactions } = await supabase
      .from('inventory_transactions')
      .select(`
        quantity,
        transaction_type,
        inventory_item:inventory_items!inner(
          shop_id,
          unit_price,
          cost_per_unit,
          sell_price_per_unit
        )
      `)
      .eq('inventory_item.shop_id', profile.shop_id)
      .gte('transaction_date', currentMonthStart.toISOString())
      .lte('transaction_date', currentMonthEnd.toISOString())
      .eq('transaction_type', 'sale');

    // Get last month transactions
    const { data: lastTransactions } = await supabase
      .from('inventory_transactions')
      .select(`
        quantity,
        transaction_type,
        inventory_item:inventory_items!inner(
          shop_id,
          unit_price,
          cost_per_unit,
          sell_price_per_unit
        )
      `)
      .eq('inventory_item.shop_id', profile.shop_id)
      .gte('transaction_date', lastMonthStart.toISOString())
      .lte('transaction_date', lastMonthEnd.toISOString())
      .eq('transaction_type', 'sale');

    const currentTotal = currentTransactions?.reduce((sum, t) => sum + Math.abs(t.quantity), 0) || 0;
    const lastTotal = lastTransactions?.reduce((sum, t) => sum + Math.abs(t.quantity), 0) || 0;
    const totalPartsUsedChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Calculate revenue using sell_price_per_unit or unit_price
    const currentRevenue = currentTransactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const price = item?.sell_price_per_unit || item?.unit_price || 0;
      return sum + (Math.abs(t.quantity) * price);
    }, 0) || 0;

    const lastRevenue = lastTransactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const price = item?.sell_price_per_unit || item?.unit_price || 0;
      return sum + (Math.abs(t.quantity) * price);
    }, 0) || 0;

    const partsRevenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Calculate cost using cost_per_unit
    const currentCost = currentTransactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const cost = item?.cost_per_unit || 0;
      return sum + (Math.abs(t.quantity) * cost);
    }, 0) || 0;

    const lastCost = lastTransactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const cost = item?.cost_per_unit || 0;
      return sum + (Math.abs(t.quantity) * cost);
    }, 0) || 0;
    
    const currentMarkup = currentCost > 0 ? ((currentRevenue - currentCost) / currentCost) * 100 : 0;
    const lastMarkup = lastCost > 0 ? ((lastRevenue - lastCost) / lastCost) * 100 : 0;
    const averageMarkupChange = lastMarkup > 0 ? ((currentMarkup - lastMarkup) / lastMarkup) * 100 : 0;

    const currentROI = currentCost > 0 ? ((currentRevenue - currentCost) / currentCost) * 100 : 0;
    const lastROI = lastCost > 0 ? ((lastRevenue - lastCost) / lastCost) * 100 : 0;
    const partsROIChange = lastROI > 0 ? ((currentROI - lastROI) / lastROI) * 100 : 0;

    return {
      totalPartsUsed: currentTotal,
      totalPartsUsedChange: Math.round(totalPartsUsedChange * 10) / 10,
      partsRevenue: currentRevenue,
      partsRevenueChange: Math.round(partsRevenueChange * 10) / 10,
      averageMarkup: Math.round(currentMarkup * 10) / 10,
      averageMarkupChange: Math.round(averageMarkupChange * 10) / 10,
      partsROI: Math.round(currentROI * 10) / 10,
      partsROIChange: Math.round(partsROIChange * 10) / 10,
    };
  } catch (error) {
    console.error('Error fetching parts analytics:', error);
    return getDefaultAnalytics();
  }
}

export async function getPartsRevenueBreakdown(): Promise<PartsRevenueBreakdown> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) {
      return getDefaultBreakdown();
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Get current month transactions with item details
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select(`
        quantity,
        inventory_item:inventory_items!inner(
          shop_id,
          unit_price,
          cost_per_unit,
          sell_price_per_unit,
          category
        )
      `)
      .eq('inventory_item.shop_id', profile.shop_id)
      .gte('transaction_date', currentMonthStart.toISOString())
      .lte('transaction_date', currentMonthEnd.toISOString())
      .eq('transaction_type', 'sale');

    const revenue = transactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const price = item?.sell_price_per_unit || item?.unit_price || 0;
      return sum + (Math.abs(t.quantity) * price);
    }, 0) || 0;

    const cost = transactions?.reduce((sum, t) => {
      const item = t.inventory_item as any;
      const itemCost = item?.cost_per_unit || 0;
      return sum + (Math.abs(t.quantity) * itemCost);
    }, 0) || 0;

    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Calculate top category
    const categoryRevenue = transactions?.reduce((acc, t) => {
      const item = t.inventory_item as any;
      const category = item?.category || 'Uncategorized';
      const price = item?.sell_price_per_unit || item?.unit_price || 0;
      const itemRevenue = Math.abs(t.quantity) * price;
      acc[category] = (acc[category] || 0) + itemRevenue;
      return acc;
    }, {} as Record<string, number>) || {};

    const topCategoryEntry = Object.entries(categoryRevenue).sort(([, a], [, b]) => b - a)[0];
    const topCategory = topCategoryEntry?.[0] || 'N/A';
    const topCategoryRevenue = topCategoryEntry?.[1] || 0;

    return {
      monthlyRevenue: revenue,
      profitMargin: Math.round(profitMargin * 10) / 10,
      topCategory,
      topCategoryRevenue,
    };
  } catch (error) {
    console.error('Error fetching parts revenue breakdown:', error);
    return getDefaultBreakdown();
  }
}

function getDefaultAnalytics(): PartsAnalytics {
  return {
    totalPartsUsed: 0,
    totalPartsUsedChange: 0,
    partsRevenue: 0,
    partsRevenueChange: 0,
    averageMarkup: 0,
    averageMarkupChange: 0,
    partsROI: 0,
    partsROIChange: 0,
  };
}

function getDefaultBreakdown(): PartsRevenueBreakdown {
  return {
    monthlyRevenue: 0,
    profitMargin: 0,
    topCategory: 'N/A',
    topCategoryRevenue: 0,
  };
}
