import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFuelUnits } from './useFuelUnits';

export interface AddFuelParams {
  compartmentId: string;
  truckId: string;
  shopId: string;
  amountToAdd: number; // In display units (gal or L)
  pricePerUnit?: number;
  vendor?: string;
  receiptNumber?: string;
  notes?: string;
  fillDate?: Date;
}

export function useAddFuelToCompartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { convertToGallons, getUnitLabel } = useFuelUnits();

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
      fillDate
    }: AddFuelParams) => {
      // First get the current compartment data
      const { data: compartment, error: fetchError } = await supabase
        .from('fuel_delivery_truck_compartments')
        .select('current_level_gallons, capacity_gallons')
        .eq('id', compartmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!compartment) throw new Error('Compartment not found');

      // Convert amount from display units to gallons for storage
      const amountInGallons = convertToGallons(amountToAdd);
      
      const previousLevel = compartment.current_level_gallons || 0;
      const newLevel = Math.min(
        previousLevel + amountInGallons,
        compartment.capacity_gallons || Infinity
      );
      const actualAmountAdded = newLevel - previousLevel;

      // Calculate total cost
      const totalCost = pricePerUnit ? pricePerUnit * amountToAdd : null;

      // Update the compartment level
      const { error: updateError } = await supabase
        .from('fuel_delivery_truck_compartments')
        .update({
          current_level_gallons: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', compartmentId);

      if (updateError) throw updateError;

      // Log the fill in history
      const { error: historyError } = await supabase
        .from('fuel_delivery_compartment_history')
        .insert({
          shop_id: shopId,
          compartment_id: compartmentId,
          truck_id: truckId,
          previous_level_gallons: previousLevel,
          new_level_gallons: newLevel,
          change_amount_gallons: actualAmountAdded,
          change_type: 'fill',
          reference_type: 'fuel_purchase',
          notes: notes || null,
          price_per_unit: pricePerUnit || null,
          total_cost: totalCost,
          vendor: vendor || null,
          receipt_number: receiptNumber || null,
          fill_date: fillDate?.toISOString() || new Date().toISOString()
        });

      if (historyError) {
        console.error('Failed to log fill history:', historyError);
        // Don't throw - the update succeeded, history is secondary
      }

      return {
        previousLevel,
        newLevel,
        actualAmountAdded,
        totalCost
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['truck-compartments', variables.truckId] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-trucks'] });
      queryClient.invalidateQueries({ queryKey: ['compartment-history', variables.compartmentId] });
      
      toast({
        title: 'Fuel Added',
        description: `Successfully added fuel to the compartment.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add fuel: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}
