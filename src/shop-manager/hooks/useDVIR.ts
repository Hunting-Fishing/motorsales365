import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { DVIRReport, DVIRInspectionType } from '@/types/safety';

export interface CreateDVIRData {
  vehicle_id: string;
  inspection_type: DVIRInspectionType;
  inspection_date: string;
  inspection_time: string;
  odometer_reading?: number;
  driver_name: string;
  brakes_ok: boolean;
  lights_ok: boolean;
  tires_ok: boolean;
  mirrors_ok: boolean;
  horn_ok: boolean;
  windshield_ok: boolean;
  wipers_ok: boolean;
  steering_ok: boolean;
  emergency_equipment_ok: boolean;
  fluid_levels_ok: boolean;
  exhaust_ok: boolean;
  coupling_devices_ok?: boolean;
  cargo_securement_ok?: boolean;
  defects_found: boolean;
  defects_description?: string;
  defect_photos?: string[];
  vehicle_safe_to_operate: boolean;
  mechanic_review_required: boolean;
  driver_signature: string;
}

export interface ReviewDVIRData {
  mechanic_notes?: string;
  repairs_completed?: boolean;
  repairs_description?: string;
  mechanic_signature: string;
}

export function useDVIR() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dvirReports, setDvirReports] = useState<DVIRReport[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchDVIRReports();
    }
  }, [shopId]);

  const fetchDVIRReports = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('dvir_reports' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('inspection_date', { ascending: false }) as any);

      if (error) throw error;
      setDvirReports((data || []) as DVIRReport[]);
    } catch (error: any) {
      console.error('Error fetching DVIR reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load DVIR reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createDVIR = async (data: CreateDVIRData) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: dvir, error } = await (supabase
        .from('dvir_reports' as any)
        .insert({
          shop_id: shopId,
          driver_id: userData.user.id,
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchDVIRReports();
      toast({
        title: 'Success',
        description: 'DVIR submitted successfully'
      });
      
      return dvir;
    } catch (error: any) {
      console.error('Error creating DVIR:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit DVIR',
        variant: 'destructive'
      });
      return null;
    }
  };

  const reviewDVIR = async (dvirId: string, reviewData: ReviewDVIRData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('dvir_reports' as any)
        .update({
          mechanic_reviewed_by: userData.user.id,
          mechanic_review_date: new Date().toISOString(),
          ...reviewData
        })
        .eq('id', dvirId) as any);

      if (error) throw error;
      
      await fetchDVIRReports();
      toast({
        title: 'Success',
        description: 'DVIR review submitted'
      });
    } catch (error: any) {
      console.error('Error reviewing DVIR:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive'
      });
    }
  };

  const getPendingReviews = () => {
    return dvirReports.filter(d => d.mechanic_review_required && !d.mechanic_reviewed_by);
  };

  return {
    loading,
    dvirReports,
    createDVIR,
    reviewDVIR,
    getPendingReviews,
    refetch: fetchDVIRReports
  };
}
