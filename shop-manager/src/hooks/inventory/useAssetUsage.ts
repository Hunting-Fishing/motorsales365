import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssetUsageConfig } from '@/types/inventory/predictive';
import { getAssetUsageConfig, createOrUpdateAssetUsage } from '@/services/inventory/predictiveService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAssetUsage() {
  const queryClient = useQueryClient();

  // Fetch all assets
  const {
    data: assets = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['asset-usage-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_usage_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AssetUsageConfig[];
    },
  });

  // Create or update asset usage
  const saveAssetMutation = useMutation({
    mutationFn: async (config: Omit<AssetUsageConfig, 'id' | 'created_at' | 'updated_at'>) => {
      return await createOrUpdateAssetUsage(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-usage-configs'] });
      toast({
        title: "Success",
        description: "Asset usage configuration saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error saving asset:', error);
      toast({
        title: "Error",
        description: "Failed to save asset usage configuration.",
        variant: "destructive",
      });
    }
  });

  // Update reading
  const updateReadingMutation = useMutation({
    mutationFn: async ({ 
      id, 
      currentReading, 
      averageUsagePerDay 
    }: { 
      id: string; 
      currentReading: number; 
      averageUsagePerDay?: number;
    }) => {
      const { data, error } = await supabase
        .from('asset_usage_config')
        .update({
          current_reading: currentReading,
          last_reading_date: new Date().toISOString(),
          average_usage_per_day: averageUsagePerDay,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-usage-configs'] });
      toast({
        title: "Reading Updated",
        description: "Asset reading has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating reading:', error);
      toast({
        title: "Error",
        description: "Failed to update asset reading.",
        variant: "destructive",
      });
    }
  });

  // Delete asset
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_usage_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-usage-configs'] });
      toast({
        title: "Asset Deleted",
        description: "Asset has been removed successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset.",
        variant: "destructive",
      });
    }
  });

  return {
    assets,
    isLoading,
    isSaving: saveAssetMutation.isPending,
    isUpdating: updateReadingMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,
    saveAsset: saveAssetMutation.mutateAsync,
    updateReading: updateReadingMutation.mutateAsync,
    deleteAsset: deleteAssetMutation.mutateAsync,
    refetch
  };
}
