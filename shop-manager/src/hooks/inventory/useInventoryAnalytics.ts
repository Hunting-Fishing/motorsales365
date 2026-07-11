import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { InventoryItemExtended } from '@/types/inventory';
import { useInventoryData } from './useInventoryData';

interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageItemValue: number;
  topCategories: Array<{ category: string; count: number; value: number }>;
  topSuppliers: Array<{ supplier: string; count: number; value: number }>;
  stockTrends: Array<{ date: string; totalStock: number; totalValue: number }>;
  turnoverRate: number;
  monthlyMovement: Array<{ month: string; added: number; removed: number }>;
}

export function useInventoryAnalytics() {
  const { items, isLoading } = useInventoryData();

  const analytics = useMemo((): InventoryAnalytics => {
    if (!items.length) {
      return {
        totalValue: 0,
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        averageItemValue: 0,
        topCategories: [],
        topSuppliers: [],
        stockTrends: [],
        turnoverRate: 0,
        monthlyMovement: []
      };
    }

    // Basic metrics
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const averageItemValue = totalValue / totalItems;

    const lowStockItems = items.filter(item => {
      const quantity = Number(item.quantity) || 0;
      const reorderPoint = Number(item.reorder_point) || 0;
      return quantity > 0 && quantity <= reorderPoint;
    }).length;

    const outOfStockItems = items.filter(item => (Number(item.quantity) || 0) <= 0).length;

    // Category analysis
    const categoryMap = new Map<string, { count: number; value: number }>();
    items.forEach(item => {
      const category = item.category || 'Uncategorized';
      const value = item.unit_price * item.quantity;
      const existing = categoryMap.get(category) || { count: 0, value: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        value: existing.value + value
      });
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Supplier analysis
    const supplierMap = new Map<string, { count: number; value: number }>();
    items.forEach(item => {
      const supplier = item.supplier || 'Unknown';
      const value = item.unit_price * item.quantity;
      const existing = supplierMap.get(supplier) || { count: 0, value: 0 };
      supplierMap.set(supplier, {
        count: existing.count + 1,
        value: existing.value + value
      });
    });

    const topSuppliers = Array.from(supplierMap.entries())
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Stock trends based on created_at dates
    const stockTrends = (() => {
      // Group items by month of creation
      const monthlyData = new Map<string, { count: number; value: number }>();
      
      items.forEach(item => {
        if (item.created_at) {
          const date = new Date(item.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const value = item.unit_price * item.quantity;
          
          const existing = monthlyData.get(monthKey) || { count: 0, value: 0 };
          monthlyData.set(monthKey, {
            count: existing.count + 1,
            value: existing.value + value
          });
        }
      });
      
      // Generate last 12 months with actual data where available
      const trends = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const data = monthlyData.get(monthKey) || { count: 0, value: 0 };
        
        return {
          date: date.toISOString().split('T')[0],
          totalStock: data.count,
          totalValue: Math.round(data.value)
        };
      });
      
      return trends;
    })();

    // Monthly movement based on created_at dates
    const monthlyMovement = (() => {
      const monthlyData = new Map<string, { added: number }>();
      
      items.forEach(item => {
        if (item.created_at) {
          const date = new Date(item.created_at);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const existing = monthlyData.get(monthKey) || { added: 0 };
          monthlyData.set(monthKey, {
            added: existing.added + 1
          });
        }
      });
      
      return Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const data = monthlyData.get(monthKey) || { added: 0 };
        
        return {
          month: monthKey,
          added: data.added,
          removed: 0 // Would need transaction tracking to calculate actual removals
        };
      });
    })();

    // Calculate average age of inventory items (turnover estimation)
    const turnoverRate = (() => {
      const now = new Date().getTime();
      const itemAges = items
        .filter(item => item.created_at)
        .map(item => {
          const createdAt = new Date(item.created_at!).getTime();
          const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
          return ageInDays;
        });
      
      if (itemAges.length === 0) return 0;
      
      const avgAgeInDays = itemAges.reduce((sum, age) => sum + age, 0) / itemAges.length;
      const avgAgeInYears = avgAgeInDays / 365;
      
      // Turnover rate = 1 / average age in years (approximation)
      return avgAgeInYears > 0 ? Number((1 / avgAgeInYears).toFixed(2)) : 0;
    })();

    return {
      totalValue,
      totalItems,
      lowStockItems,
      outOfStockItems,
      averageItemValue,
      topCategories,
      topSuppliers,
      stockTrends,
      turnoverRate,
      monthlyMovement
    };
  }, [items]);

  return {
    analytics,
    isLoading,
    refetch: () => {} // Placeholder for potential refetch functionality
  };
}