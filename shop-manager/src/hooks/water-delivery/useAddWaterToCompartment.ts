import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaterUnits } from './useWaterUnits';

export interface AddWaterParams {
  compartmentId: string;
  truckId: string;
  shopId: string;
  amountToAdd: number;
  pricePerUnit?: number;
  vendor?: string;
  receiptNumber?: string;
  notes?: string;
  fillDate?: Date;
  phLevel?: number;
  chlorineLevel?: number;
}

export function useAddWaterToCompartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { convertToGallons, getUnitLabel } = useWaterUnits();

  return useMutation({
    mutationFn: async ({
      compartmentId,
      truckId,
      shopId,
      amountToAdd,
      pricePerUnit,
      vendor,
      receiptNumber,
      notes,
      fillDate,
      phLevel,
      chlorineLevel
    }: AddWaterParams) => {
      const { data: compartment, error: fetchError } = await supabase
        .from('water_delivery_truck_compartments')
        .select('current_level_gallons, capacity_gallons')
        .eq('id', compartmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!compartment) throw new Error('Compartment not found');

      const amountInGallons = convertToGallons(amountToAdd);
      
      const previousLevel = compartment.current_level_gallons || 0;
      const newLevel = Math.min(
        previousLevel + amountInGallons,
        compartment.capacity_gallons || Infinity
      );
      const actualAmountAdded = newLevel - previousLevel;

      const totalCost = pricePerUnit ? pricePerUnit * amountToAdd : null;

      const { error: updateError } = await supabase
        .from('water_delivery_truck_compartments')
        .update({
          current_level_gallons: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', compartmentId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('water_delivery_compartment_history')
        .insert({
          shop_id: shopId,
          compartment_id: compartmentId,
          action_type: 'fill',
          gallons_before: previousLevel,
          gallons_change: actualAmountAdded,
          gallons_after: newLevel,
          source: vendor || null,
          notes: notes || null,
        });

      if (historyError) {
        console.error('Failed to log fill history:', historyError);
      }

      return {
        previousLevel,
        newLevel,
        actualAmountAdded,
        totalCost
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['water-truck-compartments', variables.truckId] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks'] });
      queryClient.invalidateQueries({ queryKey: ['water-compartment-history', variables.compartmentId] });
      
      toast({
        title: 'Water Added',
        description: `Successfully added water to the compartment.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add water: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}
