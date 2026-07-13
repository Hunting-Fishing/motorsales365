import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StockTransferInput {
  inventory_item_id: string;
  from_location: string;
  to_location: string;
  quantity: number;
  notes?: string;
  transferred_by?: string;
}

export function useStockTransfer() {
  const queryClient = useQueryClient();

  const transferStock = useMutation({
    mutationFn: async (transfer: StockTransferInput) => {
      // Record the transfer
      const { data: transferRecord, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          ...transfer,
          transferred_at: new Date().toISOString()
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Update item location
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ location: transfer.to_location })
        .eq('id', transfer.inventory_item_id);

      if (updateError) throw updateError;

      return transferRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({
        title: "Stock Transferred",
        description: "Stock has been transferred successfully.",
      });
    },
    onError: (error) => {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer stock.",
        variant: "destructive",
      });
    }
  });

  return {
    transferStock: transferStock.mutateAsync,
    isTransferring: transferStock.isPending
  };
}
