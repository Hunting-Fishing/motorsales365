import { supabase } from '@/integrations/supabase/client';
import {
  MaintenancePrediction,
  MaintenanceServiceItem,
} from '@/types/maintenance';
import { addDays, addWeeks, addMonths, addYears, differenceInDays } from 'date-fns';

/**
 * Calculate next maintenance due date based on interval
 */
export function calculateNextDueDate(
  lastServiceDate: Date,
  intervalValue: number,
  intervalUnit: string
): Date {
  switch (intervalUnit) {
    case 'days':
      return addDays(lastServiceDate, intervalValue);
    case 'weeks':
      return addWeeks(lastServiceDate, intervalValue);
    case 'months':
      return addMonths(lastServiceDate, intervalValue);
    case 'years':
      return addYears(lastServiceDate, intervalValue);
    default:
      return addMonths(lastServiceDate, intervalValue);
  }
}

/**
 * Calculate next maintenance due mileage
 */
export function calculateNextDueMileage(
  lastServiceMileage: number,
  intervalValue: number
): number {
  return lastServiceMileage + intervalValue;
}

/**
 * Generate predictive maintenance forecast for all active schedules
 */
export async function generateMaintenanceForecast(): Promise<MaintenancePrediction[]> {
  const { data: schedules, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .eq('status', 'scheduled')
    .order('next_due_date', { ascending: true });

  if (error) throw error;

  const predictions: MaintenancePrediction[] = [];

  for (const schedule of schedules || []) {
    const prediction = await calculateMaintenancePrediction(schedule);
    if (prediction) {
      predictions.push(prediction);
    }
  }

  return predictions;
}

/**
 * Calculate maintenance prediction for a single schedule
 */
async function calculateMaintenancePrediction(
  schedule: any
): Promise<MaintenancePrediction | null> {
  const today = new Date();
  const dueDate = new Date(schedule.next_due_date);
  const daysUntilDue = differenceInDays(dueDate, today);

  // Determine confidence level based on data quality
  const hasUsageData = schedule.current_mileage != null && schedule.last_service_mileage != null;
  const confidenceLevel = hasUsageData ? 0.9 : 0.7;

  // Calculate priority based on days until due
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (daysUntilDue < 0) priority = 'critical'; // Overdue
  else if (daysUntilDue <= 7) priority = 'high';
  else if (daysUntilDue <= 30) priority = 'medium';
  else priority = 'low';

  // Get required parts from service items (placeholder - will be from service packages)
  const serviceItems: MaintenanceServiceItem[] = [];

  // Calculate recommended schedule date (a few days before due date for buffer)
  const recommendedScheduleDate = addDays(dueDate, -7).toISOString();
  
  // Calculate auto-reorder date (order parts 2 weeks before)
  const autoReorderDate = addDays(dueDate, -14).toISOString();

  return {
    scheduleId: schedule.id,
    assetId: schedule.vehicle_id || schedule.equipment_id,
    assetName: `${schedule.title}`,
    maintenanceType: schedule.description || 'Scheduled Maintenance',
    
    predictedDueDate: schedule.next_due_date,
    predictedDueMileage: schedule.next_due_mileage,
    daysUntilDue,
    confidenceLevel,
    
    estimatedCost: schedule.estimated_cost || 0,
    estimatedDuration: schedule.estimated_duration || 60,
    requiredParts: serviceItems || [],
    
    recommendedScheduleDate,
    autoReorderDate: daysUntilDue <= 30 ? autoReorderDate : undefined,
    priority,
  };
}

/**
 * Generate parts list for upcoming maintenance (for manual purchase requisitions)
 */
export async function generatePartsListForMaintenance(
  scheduleId: string
): Promise<MaintenanceServiceItem[]> {
  // This will be implemented with service packages integration
  // For now, return empty array
  return [];
}

/**
 * Update maintenance schedule after service completion
 */
export async function completeMaintenanceSchedule(
  scheduleId: string,
  serviceDate: Date,
  serviceMileage?: number
): Promise<void> {
  const { data: schedule, error: fetchError } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (fetchError || !schedule) throw fetchError;

  // Calculate next due date using frequency_interval and frequency_unit
  let nextDueDate: Date;
  if (schedule.frequency_unit === 'months') {
    nextDueDate = addMonths(serviceDate, schedule.frequency_interval);
  } else if (schedule.frequency_unit === 'days') {
    nextDueDate = addDays(serviceDate, schedule.frequency_interval);
  } else {
    nextDueDate = addMonths(serviceDate, 6); // default 6 months
  }

  // Calculate next due mileage if applicable
  let nextDueMileage: number | undefined;
  if (serviceMileage && schedule.mileage_interval) {
    nextDueMileage = serviceMileage + schedule.mileage_interval;
  }

  // Update schedule
  const { error: updateError } = await supabase
    .from('maintenance_schedules')
    .update({
      last_maintenance_date: serviceDate.toISOString(),
      current_mileage: serviceMileage,
      next_due_date: nextDueDate.toISOString(),
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);

  if (updateError) throw updateError;
}

/**
 * Get oil change schedules based on current mileage
 */
export async function getOilChangeSchedules(currentMileage: number) {
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .ilike('title', '%oil%')
    .eq('status', 'scheduled');

  if (error) throw error;

  return data?.map(schedule => {
    const mileageUntilDue = schedule.mileage_interval && schedule.current_mileage
      ? (schedule.current_mileage + schedule.mileage_interval) - currentMileage 
      : null;
    
    return {
      ...schedule,
      mileageUntilDue,
      isDueSoon: mileageUntilDue !== null ? mileageUntilDue <= 500 : false,
      isOverdue: mileageUntilDue !== null ? mileageUntilDue < 0 : false,
    };
  });
}
