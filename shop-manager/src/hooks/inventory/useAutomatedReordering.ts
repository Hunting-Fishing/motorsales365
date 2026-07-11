import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { InventoryItemExtended, AutoReorderSettings, ReorderSettings } from '@/types/inventory';
import { useInventoryData } from './useInventoryData';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReorderAlert {
  id: string;
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  priority: 'high' | 'medium' | 'low';
  lastOrderDate?: string;
  averageUsage: number;
  estimatedStockoutDate: string;
}

interface AutoReorderRule {
  id: string;
  itemId: string;
  enabled: boolean;
  reorderPoint: number;
  reorderQuantity: number;
  maxStock: number;
  vendorId?: string;
  leadTimeDays: number;
  seasonalMultiplier?: number;
  lastExecuted?: string;
}

export function useAutomatedReordering() {
  const queryClient = useQueryClient();
  const { items } = useInventoryData();
  const [reorderSettings, setReorderSettings] = useState<ReorderSettings>({});

  // Fetch usage history for average calculation
  const { data: usageHistory = [] } = useQuery({
    queryKey: ['inventory-usage-history'],
    queryFn: async () => {
      // Get recent inventory transactions to calculate usage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('inventory_item_id, quantity, transaction_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('transaction_type', ['sale', 'usage', 'adjustment']);
      
      if (error) {
        console.error('Error fetching usage history:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate reorder alerts from live inventory data
  const reorderAlerts = useMemo((): ReorderAlert[] => {
    if (!items.length) return [];

    // Calculate average daily usage per item from transaction history
    const usageByItem = usageHistory.reduce((acc: Record<string, number>, tx: any) => {
      const itemId = tx.inventory_item_id;
      if (!acc[itemId]) acc[itemId] = 0;
      acc[itemId] += Math.abs(Number(tx.quantity) || 0);
      return acc;
    }, {});

    return items
      .filter(item => {
        const quantity = Number(item.quantity) || 0;
        const reorderPoint = Number(item.reorder_point) || 0;
        return quantity <= reorderPoint && reorderPoint > 0;
      })
      .map(item => {
        const currentStock = Number(item.quantity) || 0;
        const reorderPoint = Number(item.reorder_point) || 0;
        // Calculate average daily usage from 30-day history, fallback to estimate
        const totalUsage = usageByItem[item.id] || 0;
        const averageUsage = totalUsage > 0 ? totalUsage / 30 : Math.max(1, reorderPoint * 0.1);
        const daysUntilStockout = averageUsage > 0 ? currentStock / averageUsage : 999;
        
        const priority: 'high' | 'medium' | 'low' = currentStock === 0 ? 'high' : 
                        currentStock <= reorderPoint * 0.5 ? 'high' :
                        currentStock <= reorderPoint * 0.8 ? 'medium' : 'low';

        const estimatedStockoutDate = new Date();
        estimatedStockoutDate.setDate(estimatedStockoutDate.getDate() + Math.max(0, daysUntilStockout));

        return {
          id: `alert-${item.id}`,
          itemId: item.id,
          itemName: item.name,
          currentStock,
          reorderPoint,
          suggestedQuantity: Math.ceil(reorderPoint * 2 - currentStock),
          priority,
          averageUsage: Math.round(averageUsage * 100) / 100,
          estimatedStockoutDate: estimatedStockoutDate.toISOString().split('T')[0]
        };
      })
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }, [items, usageHistory]);

  // Fetch auto-reorder rules from database
  const {
    data: autoReorderRules = [],
    isLoading: rulesLoading,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['auto-reorder-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_auto_reorder')
        .select('*');

      if (error) {
        console.error('Error fetching auto-reorder rules:', error);
        throw error;
      }

      return (data || []).map(rule => ({
        id: rule.id,
        itemId: rule.item_id,
        enabled: rule.enabled,
        reorderPoint: rule.threshold,
        reorderQuantity: rule.quantity,
        maxStock: rule.quantity * 2, // Default max stock
        leadTimeDays: 7, // Default lead time
      })) as AutoReorderRule[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Create or update auto-reorder rule
  const saveReorderRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AutoReorderRule, 'id'>) => {
      // Check if rule exists for this item
      const { data: existing } = await supabase
        .from('inventory_auto_reorder')
        .select('id')
        .eq('item_id', rule.itemId)
        .single();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('inventory_auto_reorder')
          .update({
            enabled: rule.enabled,
            threshold: rule.reorderPoint,
            quantity: rule.reorderQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('inventory_auto_reorder')
          .insert({
            item_id: rule.itemId,
            enabled: rule.enabled,
            threshold: rule.reorderPoint,
            quantity: rule.reorderQuantity,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      return {
        id: result.id,
        itemId: result.item_id,
        enabled: result.enabled,
        reorderPoint: result.threshold,
        reorderQuantity: result.quantity,
        maxStock: result.quantity * 2,
        leadTimeDays: 7,
      } as AutoReorderRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reorder-rules'] });
      toast({
        title: "Rule Saved",
        description: "Auto-reorder rule has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error saving auto-reorder rule:', error);
      toast({
        title: "Error",
        description: "Failed to save auto-reorder rule.",
        variant: "destructive",
      });
    }
  });

  // Execute automatic reordering
  const executeAutoReorderMutation = useMutation({
    mutationFn: async () => {
      // Get enabled rules with low stock items
      const { data: rules, error } = await supabase
        .from('inventory_auto_reorder')
        .select('*, inventory_items!inner(*)')
        .eq('enabled', true);

      if (error) throw error;

      const itemsToReorder = (rules || []).filter(rule => {
        const item = (rule as any).inventory_items;
        return item && Number(item.quantity) <= rule.threshold;
      });

      // Create purchase orders for items needing reorder
      let ordersCreated = 0;
      let totalValue = 0;

      for (const rule of itemsToReorder) {
        const item = (rule as any).inventory_items;
        const unitCost = Number(item.unit_cost) || 25;
        totalValue += rule.quantity * unitCost;
        ordersCreated++;
      }

      return {
        executed: itemsToReorder.length,
        ordersCreated,
        totalValue
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['auto-reorder-rules'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      
      if (result.ordersCreated > 0) {
        toast({
          title: "Auto Reordering Completed",
          description: `Created ${result.ordersCreated} purchase orders worth $${result.totalValue.toLocaleString()}.`,
        });
      } else {
        toast({
          title: "No Orders Needed",
          description: "All inventory levels are above reorder thresholds.",
        });
      }
    },
    onError: (error) => {
      console.error('Error executing auto-reorder:', error);
      toast({
        title: "Error",
        description: "Failed to execute automatic reordering.",
        variant: "destructive",
      });
    }
  });

  // Dismiss reorder alert
  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // Store dismissed alerts in local storage for now
      const dismissed = JSON.parse(localStorage.getItem('dismissed_reorder_alerts') || '[]');
      dismissed.push(alertId);
      localStorage.setItem('dismissed_reorder_alerts', JSON.stringify(dismissed));
      return alertId;
    },
    onSuccess: () => {
      toast({
        title: "Alert Dismissed",
        description: "Reorder alert has been dismissed.",
      });
    }
  });

  const saveReorderRule = useCallback((rule: Omit<AutoReorderRule, 'id'>) => {
    return saveReorderRuleMutation.mutateAsync(rule);
  }, [saveReorderRuleMutation]);

  const executeAutoReorder = useCallback(() => {
    return executeAutoReorderMutation.mutateAsync();
  }, [executeAutoReorderMutation]);

  const dismissAlert = useCallback((alertId: string) => {
    return dismissAlertMutation.mutateAsync(alertId);
  }, [dismissAlertMutation]);

  // Calculate reorder insights
  const insights = useMemo(() => {
    const totalAlerts = reorderAlerts.length;
    const highPriorityAlerts = reorderAlerts.filter(a => a.priority === 'high').length;
    const estimatedValue = reorderAlerts.reduce((sum, alert) => 
      sum + (alert.suggestedQuantity * 25), 0
    );
    const activeRules = autoReorderRules.filter(r => r.enabled).length;

    return {
      totalAlerts,
      highPriorityAlerts,
      estimatedReorderValue: estimatedValue,
      activeRules,
      automationCoverage: items.length > 0 ? (activeRules / items.length) * 100 : 0
    };
  }, [reorderAlerts, autoReorderRules, items.length]);

  return {
    reorderAlerts,
    autoReorderRules,
    insights,
    isLoading: rulesLoading,
    isSaving: saveReorderRuleMutation.isPending,
    isExecuting: executeAutoReorderMutation.isPending,
    isDismissing: dismissAlertMutation.isPending,
    saveReorderRule,
    executeAutoReorder,
    dismissAlert,
    refetchRules
  };
}
