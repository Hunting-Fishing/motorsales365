import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Equipment, EquipmentStats } from '@/types/equipment';

export function useEquipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    total: 0,
    operational: 0,
    needsMaintenance: 0,
    outOfService: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    try {
      console.log("Fetching equipment data...");
      
      // CRITICAL: Ensure auth is ready first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user, cannot fetch equipment");
        setIsLoading(false);
        return;
      }
      
      // Get user's shop_id - handle both profile patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
        
      if (!profile?.shop_id) {
        console.log("No shop_id found for user");
        setIsLoading(false);
        return;
      }
      
      console.log("Fetching equipment for shop_id:", profile.shop_id);
      
      // Query with explicit shop_id filter to avoid RLS timing issues
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const equipmentData = (data || []).map((item: any) => ({
        ...item,
        category: item.equipment_type || 'other',
        customer: 'Internal',
        install_date: item.purchase_date || item.created_at,
        warranty_expiry_date: item.purchase_date || item.created_at,
        warranty_status: 'active',
        last_maintenance_date: item.last_service_date || item.created_at,
        next_maintenance_date: item.next_service_date || item.created_at,
        maintenance_frequency: '90 days',
        work_order_history: [],
        maintenance_history: [],
        maintenance_schedules: []
      }));
      setEquipment(equipmentData);

      // Calculate stats
      const stats: EquipmentStats = {
        total: equipmentData.length,
        operational: equipmentData.filter(item => item.status === 'operational').length,
        needsMaintenance: equipmentData.filter(item => item.status === 'maintenance').length,
        outOfService: equipmentData.filter(item => item.status === 'down' || item.status === 'retired').length
      };
      setStats(stats);
      
      console.log("Equipment data loaded:", equipmentData.length, "items");
      setError(null);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
      setEquipment([]);
      setStats({ total: 0, operational: 0, needsMaintenance: 0, outOfService: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  return {
    equipment,
    stats,
    isLoading,
    error,
    refetch: fetchEquipment
  };
}