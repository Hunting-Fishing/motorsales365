import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItemExtended } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';

export function useInventoryItem(itemId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch single inventory item
  const {
    data: item,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: async (): Promise<InventoryItemExtended | null> => {
      if (!itemId) return null;

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching inventory item:', error);
        throw error;
      }

      // Map the data to include all extended fields
      if (data) {
        const mappedData = {
          ...data,
          price: data.unit_price, // Map unit_price to price for UI compatibility
          webLinks: data.web_links || [], // Map web_links from DB to webLinks
          web_links: data.web_links || [] // Keep both for compatibility
        };
        console.log('Fetched item data:', mappedData);
        return mappedData as InventoryItemExtended;
      }

      return null;
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update inventory item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (updates: Partial<InventoryItemExtended>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        price: data.unit_price
      } as InventoryItemExtended;
    },
    onSuccess: (updatedItem) => {
      // Update the single item cache
      queryClient.setQueryData(['inventory-item', itemId], updatedItem);
      
      // Update the items list cache
      queryClient.setQueryData(['inventory-items'], (oldData: InventoryItemExtended[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item => 
          item.id === itemId ? updatedItem : item
        );
      });

      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating inventory item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  return {
    item,
    isLoading,
    error: error?.message || null,
    refetch,
    updateItem: updateItemMutation.mutate,
    isUpdating: updateItemMutation.isPending,
  };
}