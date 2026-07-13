import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import type { SafetyDashboardStats, SafetyIncident, DailyShopInspection, LiftHoistInspection } from '@/types/safety';

export function useSafetyDashboard() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SafetyDashboardStats>({
    openIncidents: 0,
    criticalIncidents: 0,
    todayInspectionsCompleted: 0,
    todayInspectionsTotal: 0,
    expiringCertificates: 0,
    expiredCertificates: 0,
    unsafeEquipment: 0,
    pendingDVIRs: 0
  });
  const [recentIncidents, setRecentIncidents] = useState<SafetyIncident[]>([]);
  const [todayInspections, setTodayInspections] = useState<DailyShopInspection[]>([]);
  const [unsafeLifts, setUnsafeLifts] = useState<LiftHoistInspection[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchDashboardData();
    }
  }, [shopId]);

  const fetchDashboardData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Fetch incidents - cast to any to handle new tables not yet in types
      const { data: incidents } = await (supabase
        .from('safety_incidents' as any)
        .select('*')
        .eq('shop_id', shopId)
        .in('investigation_status', ['open', 'under_investigation'])
        .order('incident_date', { ascending: false })
        .limit(10) as any);

      // Fetch today's inspections
      const { data: inspections } = await (supabase
        .from('daily_shop_inspections' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('inspection_date', today) as any);

      // Fetch lifts marked unsafe
      const { data: lifts } = await (supabase
        .from('lift_hoist_inspections' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('safe_for_use', false)
        .order('inspection_date', { ascending: false }) as any);

      // Fetch pending DVIR reviews
      const { data: dvirs } = await (supabase
        .from('dvir_reports' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('mechanic_review_required', true)
        .is('mechanic_reviewed_by', null) as any);

      // Fetch expiring certificates
      const { data: expiringCerts } = await supabase
        .from('staff_certificates')
        .select('*')
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', today);

      const { data: expiredCerts } = await supabase
        .from('staff_certificates')
        .select('*')
        .lt('expiry_date', today);

      const typedIncidents = (incidents || []) as unknown as SafetyIncident[];
      const typedInspections = (inspections || []) as unknown as DailyShopInspection[];
      const typedLifts = (lifts || []) as unknown as LiftHoistInspection[];

      setRecentIncidents(typedIncidents);
      setTodayInspections(typedInspections);
      setUnsafeLifts(typedLifts);

      setStats({
        openIncidents: typedIncidents.length,
        criticalIncidents: typedIncidents.filter(i => i.severity === 'critical').length,
        todayInspectionsCompleted: typedInspections.length,
        todayInspectionsTotal: 3, // Expected inspections per day (configurable)
        expiringCertificates: expiringCerts?.length || 0,
        expiredCertificates: expiredCerts?.length || 0,
        unsafeEquipment: typedLifts.length,
        pendingDVIRs: dvirs?.length || 0
      });

    } catch (error) {
      console.error('Error fetching safety dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    stats,
    recentIncidents,
    todayInspections,
    unsafeLifts,
    refetch: fetchDashboardData
  };
}
