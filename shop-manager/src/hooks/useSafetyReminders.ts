import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { addDays, differenceInDays, format, isPast, isToday } from 'date-fns';

export interface SafetyReminder {
  id: string;
  type: 'inspection' | 'certification' | 'dvir' | 'equipment';
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'upcoming' | 'due_today' | 'overdue';
  entityId?: string;
  entityType?: string;
}

export interface InspectionSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  lastCompleted?: string;
  nextDue: string;
  enabled: boolean;
}

export function useSafetyReminders() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<SafetyReminder[]>([]);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchReminders();
    }
  }, [shopId]);

  const fetchReminders = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thirtyDaysFromNow = addDays(today, 30);
      const allReminders: SafetyReminder[] = [];

      // Check for expiring certifications
      const { data: expiringCerts } = await supabase
        .from('staff_certificates')
        .select('id, expiry_date, certificate_type_id, staff_id')
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expiry_date');

      expiringCerts?.forEach((cert) => {
        const dueDate = new Date(cert.expiry_date);
        const daysUntil = differenceInDays(dueDate, today);
        
        let priority: SafetyReminder['priority'] = 'low';
        let status: SafetyReminder['status'] = 'upcoming';
        
        if (isPast(dueDate)) {
          priority = 'critical';
          status = 'overdue';
        } else if (isToday(dueDate)) {
          priority = 'high';
          status = 'due_today';
        } else if (daysUntil <= 7) {
          priority = 'high';
        } else if (daysUntil <= 14) {
          priority = 'medium';
        }

        allReminders.push({
          id: `cert-${cert.id}`,
          type: 'certification',
          title: 'Certificate Expiring',
          description: `Staff certificate expires ${format(dueDate, 'MMM d, yyyy')}`,
          dueDate: cert.expiry_date,
          priority,
          status,
          entityId: cert.id,
          entityType: 'certificate'
        });
      });

      // Check for daily inspection requirement
      const { data: todayInspection } = await (supabase
        .from('daily_shop_inspections' as any)
        .select('id')
        .eq('shop_id', shopId)
        .eq('inspection_date', todayStr)
        .limit(1) as any);

      if (!todayInspection || todayInspection.length === 0) {
        allReminders.push({
          id: 'daily-inspection',
          type: 'inspection',
          title: 'Daily Shop Inspection Required',
          description: 'Complete the daily safety inspection',
          dueDate: todayStr,
          priority: 'high',
          status: 'due_today'
        });
      }

      // Check for pending DVIR reviews
      const { data: pendingDVIRs } = await (supabase
        .from('dvir_reports' as any)
        .select('id, inspection_date, vehicle_id')
        .eq('shop_id', shopId)
        .eq('mechanic_review_required', true)
        .is('mechanic_reviewed_by', null) as any);

      pendingDVIRs?.forEach((dvir: any) => {
        allReminders.push({
          id: `dvir-${dvir.id}`,
          type: 'dvir',
          title: 'DVIR Review Required',
          description: `Vehicle ${dvir.vehicle_id?.slice(0, 8) || 'Unknown'} needs mechanic review`,
          dueDate: dvir.inspection_date,
          priority: 'high',
          status: isPast(new Date(dvir.inspection_date)) ? 'overdue' : 'due_today',
          entityId: dvir.id,
          entityType: 'dvir'
        });
      });

      // Check for locked out equipment
      const { data: lockedEquipment } = await (supabase
        .from('lift_hoist_inspections' as any)
        .select('id, equipment_name, lockout_date')
        .eq('shop_id', shopId)
        .eq('locked_out', true) as any);

      lockedEquipment?.forEach((equip: any) => {
        allReminders.push({
          id: `equip-${equip.id}`,
          type: 'equipment',
          title: 'Equipment Locked Out',
          description: `${equip.equipment_name} is out of service`,
          dueDate: equip.lockout_date || todayStr,
          priority: 'critical',
          status: 'overdue',
          entityId: equip.id,
          entityType: 'equipment'
        });
      });

      // Sort by priority and date
      allReminders.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setReminders(allReminders);

      // Fetch vehicle maintenance reminders
      const { data: vehicleSchedules } = await (supabase
        .from('safety_schedules' as any)
        .select('*, vehicle:vehicles(make, model, license_plate)')
        .eq('shop_id', shopId)
        .not('vehicle_id', 'is', null) as any);

      vehicleSchedules?.forEach((schedule: any) => {
        const dueDate = new Date(schedule.next_due_date);
        const daysUntil = differenceInDays(dueDate, today);
        
        let priority: SafetyReminder['priority'] = 'low';
        let status: SafetyReminder['status'] = 'upcoming';
        
        if (isPast(dueDate)) {
          priority = 'high';
          status = 'overdue';
        } else if (isToday(dueDate)) {
          priority = 'high';
          status = 'due_today';
        } else if (daysUntil <= 7) {
          priority = 'medium';
        }

        const vehicleInfo = schedule.vehicle ? 
          `${schedule.vehicle.make} ${schedule.vehicle.model} (${schedule.vehicle.license_plate})` : 
          'Unknown Vehicle';

        allReminders.push({
          id: `vehicle-maint-${schedule.id}`,
          type: 'equipment',
          title: `Vehicle Maintenance: ${schedule.schedule_name}`,
          description: `${vehicleInfo} - Due ${format(dueDate, 'MMM d, yyyy')}`,
          dueDate: schedule.next_due_date,
          priority,
          status,
          entityId: schedule.vehicle_id,
          entityType: 'vehicle'
        });
      });

      // Fetch database schedules
      const { data: dbSchedules } = await (supabase
        .from('safety_schedules' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_enabled', true)
        .is('vehicle_id', null) as any);

      if (dbSchedules && dbSchedules.length > 0) {
        setSchedules(dbSchedules.map((s: any) => ({
          id: s.id,
          name: s.schedule_name,
          frequency: s.frequency,
          lastCompleted: s.last_completed_date,
          nextDue: s.next_due_date,
          enabled: s.is_enabled
        })));
      } else {
        // Fallback to defaults
        setSchedules([
          {
            id: 'daily-shop',
            name: 'Daily Shop Inspection',
            frequency: 'daily',
            nextDue: todayStr,
            enabled: true
          },
          {
            id: 'weekly-lift',
            name: 'Weekly Lift/Hoist Check',
            frequency: 'weekly',
            nextDue: addDays(today, 7 - today.getDay()).toISOString().split('T')[0],
            enabled: true
          },
          {
            id: 'monthly-safety',
            name: 'Monthly Safety Review',
            frequency: 'monthly',
            nextDue: format(new Date(today.getFullYear(), today.getMonth() + 1, 1), 'yyyy-MM-dd'),
            enabled: true
          },
          {
            id: 'quarterly-training',
            name: 'Quarterly Safety Training',
            frequency: 'quarterly',
            nextDue: format(new Date(today.getFullYear(), Math.ceil((today.getMonth() + 1) / 3) * 3, 1), 'yyyy-MM-dd'),
            enabled: true
          }
        ]);
      }

    } catch (error) {
      console.error('Error fetching safety reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverdueReminders = () => reminders.filter(r => r.status === 'overdue');
  const getDueTodayReminders = () => reminders.filter(r => r.status === 'due_today');
  const getUpcomingReminders = () => reminders.filter(r => r.status === 'upcoming');
  const getCriticalReminders = () => reminders.filter(r => r.priority === 'critical');

  return {
    loading,
    reminders,
    schedules,
    getOverdueReminders,
    getDueTodayReminders,
    getUpcomingReminders,
    getCriticalReminders,
    refetch: fetchReminders
  };
}
