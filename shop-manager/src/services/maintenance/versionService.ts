import { supabase } from '@/integrations/supabase/client';
import { recordMaintenanceActivity } from './maintenanceActivityService';

/**
 * Save a version before updating a schedule
 */
export const saveScheduleVersion = async (
  scheduleId: string,
  scheduleData: any,
  userId: string,
  userName: string,
  changeReason?: string
): Promise<void> => {
  try {
    // Get current version count
    const { data: versions } = await supabase
      .from('maintenance_schedule_versions')
      .select('version_number')
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions && versions[0]?.version_number || 0) + 1;

    await supabase
      .from('maintenance_schedule_versions')
      .insert({
        schedule_id: scheduleId,
        version_number: nextVersion,
        snapshot: scheduleData,
        changed_by: userId,
        changed_by_name: userName,
        change_reason: changeReason,
      });
  } catch (error) {
    console.error('Error saving schedule version:', error);
  }
};

/**
 * Get all versions for a schedule
 */
export const getScheduleVersions = async (scheduleId: string) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_schedule_versions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching schedule versions:', error);
    return [];
  }
};

/**
 * Restore a schedule to a previous version
 */
export const restoreScheduleVersion = async (
  scheduleId: string,
  versionId: string,
  userId: string,
  userName: string,
  shopId: string
): Promise<boolean> => {
  try {
    // Get the version snapshot
    const { data: version, error: versionError } = await supabase
      .from('maintenance_schedule_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (versionError) throw versionError;

    // Get current schedule for version tracking
    const { data: currentSchedule } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    // Save current state as a version before restoring
    if (currentSchedule) {
      await saveScheduleVersion(
        scheduleId,
        currentSchedule,
        userId,
        userName,
        `Before restoring to version ${version.version_number}`
      );
    }

    // Restore the schedule
    const snapshotData = version.snapshot as any;
    const { error: updateError } = await supabase
      .from('maintenance_schedules')
      .update({
        title: snapshotData.title,
        description: snapshotData.description,
        maintenance_type: snapshotData.maintenance_type,
        frequency_type: snapshotData.frequency_type,
        frequency_interval: snapshotData.frequency_interval,
        frequency_unit: snapshotData.frequency_unit,
        mileage_interval: snapshotData.mileage_interval,
        estimated_cost: snapshotData.estimated_cost,
        priority: snapshotData.priority,
        status: snapshotData.status,
      })
      .eq('id', scheduleId);

    if (updateError) throw updateError;

    // Record activity
    // Record activity
    await recordMaintenanceActivity(
      `Restored schedule to version ${version.version_number}`,
      shopId,
      userId,
      userName,
      scheduleId,
      undefined,
      {
        version_number: version.version_number,
        restored_from: version.created_at,
      }
    );

    return true;
  } catch (error) {
    console.error('Error restoring schedule version:', error);
    return false;
  }
};
