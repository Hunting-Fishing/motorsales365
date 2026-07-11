import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConsumptionHistory, ConsumptionRate } from '@/types/inventory/predictive';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryQuantity } from '@/services/inventory/crudService';

interface RecordConsumptionParams {
  inventory_item_id: string;
  quantity_consumed: number;
  usage_metric: string;
  usage_value: number;
  service_package_id?: string;
  work_order_id?: string;
  notes?: string;
}

export function useConsumptionTracking() {
  const queryClient = useQueryClient();

  // Fetch consumption history
  const {
    data: consumptionHistory = [],
    isLoading: historyLoading
  } = useQuery({
    queryKey: ['consumption-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_consumption_history')
        .select(`
          *,
          inventory_items:inventory_item_id(name, sku),
          service_packages:service_package_id(name)
        `)
        .order('consumed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch consumption rates
  const {
    data: consumptionRates = [],
    isLoading: ratesLoading
  } = useQuery({
    queryKey: ['consumption-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_consumption_rates')
        .select(`
          *,
          inventory_items:inventory_item_id(name, sku, quantity)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Record consumption
  const recordConsumptionMutation = useMutation({
    mutationFn: async (params: RecordConsumptionParams) => {
      // First, record the consumption history
      const { data: consumption, error: consumptionError } = await supabase
        .from('inventory_consumption_history')
        .insert({
          inventory_item_id: params.inventory_item_id,
          quantity_consumed: params.quantity_consumed,
          usage_metric: params.usage_metric,
          usage_value: params.usage_value,
          service_package_id: params.service_package_id,
          work_order_id: params.work_order_id,
          notes: params.notes,
          consumed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (consumptionError) throw consumptionError;

      // Update inventory quantity
      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', params.inventory_item_id)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Math.max(0, (currentItem.quantity || 0) - params.quantity_consumed);
      
      await updateInventoryQuantity(params.inventory_item_id, newQuantity);

      // Update or create consumption rate
      const { data: existingRate } = await supabase
        .from('inventory_consumption_rates')
        .select('*')
        .eq('inventory_item_id', params.inventory_item_id)
        .eq('usage_metric', params.usage_metric)
        .single();

      if (existingRate) {
        // Calculate new average
        const consumptionPerUnit = params.quantity_consumed / params.usage_value;
        const newAverage = existingRate.average_consumption 
          ? (existingRate.average_consumption + consumptionPerUnit) / 2
          : consumptionPerUnit;

        await supabase
          .from('inventory_consumption_rates')
          .update({
            consumption_per_unit: consumptionPerUnit,
            average_consumption: newAverage,
            last_calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRate.id);
      } else {
        // Create new rate
        await supabase
          .from('inventory_consumption_rates')
          .insert({
            inventory_item_id: params.inventory_item_id,
            usage_metric: params.usage_metric,
            consumption_per_unit: params.quantity_consumed / params.usage_value,
            average_consumption: params.quantity_consumed / params.usage_value,
            last_calculated_at: new Date().toISOString()
          });
      }

      return consumption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-history'] });
      queryClient.invalidateQueries({ queryKey: ['consumption-rates'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-forecasts'] });
      
      toast({
        title: "Consumption Recorded",
        description: "Parts consumption has been logged and inventory updated.",
      });
    },
    onError: (error) => {
      console.error('Error recording consumption:', error);
      toast({
        title: "Error",
        description: "Failed to record parts consumption.",
        variant: "destructive",
      });
    }
  });

  // Delete consumption record
  const deleteConsumptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_consumption_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-history'] });
      toast({
        title: "Record Deleted",
        description: "Consumption record has been removed.",
      });
    },
    onError: (error) => {
      console.error('Error deleting consumption:', error);
      toast({
        title: "Error",
        description: "Failed to delete consumption record.",
        variant: "destructive",
      });
    }
  });

  return {
    consumptionHistory,
    consumptionRates,
    isLoading: historyLoading || ratesLoading,
    isRecording: recordConsumptionMutation.isPending,
    isDeleting: deleteConsumptionMutation.isPending,
    recordConsumption: recordConsumptionMutation.mutateAsync,
    deleteConsumption: deleteConsumptionMutation.mutateAsync
  };
}
