import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type FuelEntry = Database['public']['Tables']['fuel_entries']['Row'];
type FuelCard = Database['public']['Tables']['fuel_cards']['Row'];
type FuelStation = Database['public']['Tables']['fuel_stations']['Row'];
type FuelBudget = Database['public']['Tables']['fuel_budgets']['Row'];

export type { FuelEntry, FuelCard, FuelStation, FuelBudget };

export function useFuelManagement() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  // Fetch fuel entries
  const { data: fuelEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['fuel-entries', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('shop_id', shopId)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Fetch fuel cards
  const { data: fuelCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['fuel-cards', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('fuel_cards')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Fetch fuel stations
  const { data: fuelStations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ['fuel-stations', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('fuel_stations')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Fetch fuel budgets
  const { data: fuelBudgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['fuel-budgets', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('fuel_budgets')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Create fuel entry
  const createFuelEntry = useMutation({
    mutationFn: async (entry: Omit<Database['public']['Tables']['fuel_entries']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('fuel_entries')
        .insert({ ...entry, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-entries'] });
      toast.success('Fuel entry added');
    },
    onError: (error) => {
      toast.error('Failed to add fuel entry: ' + error.message);
    }
  });

  // Create fuel card
  const createFuelCard = useMutation({
    mutationFn: async (card: Omit<Database['public']['Tables']['fuel_cards']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('fuel_cards')
        .insert({ ...card, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-cards'] });
      toast.success('Fuel card added');
    },
    onError: (error) => {
      toast.error('Failed to add fuel card: ' + error.message);
    }
  });

  // Update fuel card
  const updateFuelCard = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Database['public']['Tables']['fuel_cards']['Update']) => {
      const { data, error } = await supabase
        .from('fuel_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-cards'] });
      toast.success('Fuel card updated');
    },
    onError: (error) => {
      toast.error('Failed to update fuel card: ' + error.message);
    }
  });

  // Create fuel station
  const createFuelStation = useMutation({
    mutationFn: async (station: Omit<Database['public']['Tables']['fuel_stations']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('fuel_stations')
        .insert({ ...station, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-stations'] });
      toast.success('Fuel station added');
    },
    onError: (error) => {
      toast.error('Failed to add fuel station: ' + error.message);
    }
  });

  // Create fuel budget
  const createFuelBudget = useMutation({
    mutationFn: async (budget: Omit<Database['public']['Tables']['fuel_budgets']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('fuel_budgets')
        .insert({ ...budget, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-budgets'] });
      toast.success('Fuel budget created');
    },
    onError: (error) => {
      toast.error('Failed to create fuel budget: ' + error.message);
    }
  });

  // Calculate fuel statistics
  const fuelStats = {
    totalGallons: fuelEntries.reduce((sum, e) => sum + (e.fuel_amount || 0), 0),
    totalCost: fuelEntries.reduce((sum, e) => sum + (e.cost || 0), 0),
    avgCostPerGallon: fuelEntries.length > 0 
      ? fuelEntries.reduce((sum, e) => sum + (e.cost || 0), 0) / fuelEntries.reduce((sum, e) => sum + (e.fuel_amount || 0), 0) 
      : 0,
    entriesThisMonth: fuelEntries.filter(e => {
      if (!e.entry_date) return false;
      const entryDate = new Date(e.entry_date);
      const now = new Date();
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    }).length,
    activeCards: fuelCards.filter(c => c.status === 'active').length
  };

  return {
    fuelEntries,
    fuelCards,
    fuelStations,
    fuelBudgets,
    fuelStats,
    isLoading: entriesLoading || cardsLoading || stationsLoading || budgetsLoading,
    createFuelEntry,
    createFuelCard,
    updateFuelCard,
    createFuelStation,
    createFuelBudget
  };
}
