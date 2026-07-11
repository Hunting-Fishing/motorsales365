import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyLogEntry {
  id: string;
  type: 'engine_hours' | 'trip' | 'fuel' | 'maintenance';
  date: string;
  equipment_id: string;
  equipment_name: string;
  description: string;
  value?: number;
  unit?: string;
  performed_by?: string;
  performer_name?: string;
  completion_status?: string;
  metadata?: Record<string, any>;
}

export interface DailyLogsFilters {
  equipmentId?: string;
  logType?: string;
  dateFrom?: string;
  dateTo?: string;
  performedBy?: string;
}

export function useDailyLogsHistory(filters: DailyLogsFilters = {}) {
  return useQuery({
    queryKey: ['daily-logs-history', filters],
    queryFn: async () => {
      const logs: DailyLogEntry[] = [];

      // Fetch engine hours logs
      if (!filters.logType || filters.logType === 'engine_hours') {
        let query = supabase
          .from('equipment_usage_logs')
          .select(`
            id,
            reading_date,
            reading_value,
            reading_type,
            notes,
            equipment_id,
            recorded_by,
            equipment_assets!inner(id, name)
          `)
          .eq('reading_type', 'hours')
          .order('reading_date', { ascending: false });

        if (filters.equipmentId) {
          query = query.eq('equipment_id', filters.equipmentId);
        }
        if (filters.dateFrom) {
          query = query.gte('reading_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('reading_date', filters.dateTo);
        }

        const { data: engineLogs } = await query;
        
        if (engineLogs) {
          for (const log of engineLogs) {
            const equipmentData = log.equipment_assets as any;
            logs.push({
              id: log.id,
              type: 'engine_hours',
              date: log.reading_date,
              equipment_id: log.equipment_id,
              equipment_name: equipmentData?.name || 'Unknown',
              description: log.notes || 'Engine hours recorded',
              value: log.reading_value,
              unit: 'hours',
              performed_by: log.recorded_by,
              metadata: { reading_type: log.reading_type }
            });
          }
        }
      }

      // Fetch trip logs
      if (!filters.logType || filters.logType === 'trip') {
        let query = supabase
          .from('trip_logs')
          .select('*')
          .order('trip_date', { ascending: false });

        if (filters.equipmentId) {
          query = query.eq('equipment_id', filters.equipmentId);
        }
        if (filters.dateFrom) {
          query = query.gte('trip_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('trip_date', filters.dateTo);
        }

        const { data: tripLogs } = await query;
        
        if (tripLogs) {
          for (const log of tripLogs) {
            const distance = log.end_reading && log.start_reading 
              ? log.end_reading - log.start_reading 
              : 0;
            logs.push({
              id: log.id,
              type: 'trip',
              date: log.trip_date,
              equipment_id: log.equipment_id || '',
              equipment_name: 'Equipment',
              description: `Trip to ${log.destination || 'destination'}`,
              value: distance,
              unit: log.reading_type || 'miles',
              performed_by: log.entered_by,
              metadata: { 
                destination: log.destination,
                purpose: log.purpose,
                driver: log.driver_name
              }
            });
          }
        }
      }

      // Fetch fuel entries
      if (!filters.logType || filters.logType === 'fuel') {
        let query = supabase
          .from('fuel_entries')
          .select('*')
          .order('entry_date', { ascending: false });

        if (filters.equipmentId) {
          query = query.eq('equipment_id', filters.equipmentId);
        }
        if (filters.dateFrom) {
          query = query.gte('entry_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('entry_date', filters.dateTo);
        }

        const { data: fuelLogs } = await query;
        
        if (fuelLogs) {
          for (const log of fuelLogs) {
            logs.push({
              id: log.id,
              type: 'fuel',
              date: log.entry_date,
              equipment_id: log.equipment_id || '',
              equipment_name: 'Equipment',
              description: `Fuel: ${log.fuel_amount || 0} ${log.fuel_unit || 'gal'} - $${log.cost || 0}`,
              value: log.fuel_amount,
              unit: log.fuel_unit || 'gallons',
              performed_by: log.entered_by,
              metadata: {
                cost: log.cost,
                odometer: log.odometer_reading,
                location: log.location
              }
            });
          }
        }
      }

      // Fetch maintenance logs (uses log_date not maintenance_date)
      if (!filters.logType || filters.logType === 'maintenance') {
        let query = supabase
          .from('maintenance_logs')
          .select(`
            id,
            log_date,
            maintenance_type,
            description,
            equipment_id,
            performed_by,
            completion_status,
            hours_at_service,
            equipment_assets(id, name)
          `)
          .order('log_date', { ascending: false });

        if (filters.equipmentId) {
          query = query.eq('equipment_id', filters.equipmentId);
        }
        if (filters.dateFrom) {
          query = query.gte('log_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('log_date', filters.dateTo);
        }

        const { data: maintLogs } = await query;
        
        if (maintLogs) {
          for (const log of maintLogs) {
            const equipmentData = log.equipment_assets as any;
            logs.push({
              id: log.id,
              type: 'maintenance',
              date: log.log_date,
              equipment_id: log.equipment_id || '',
              equipment_name: equipmentData?.name || 'Unknown',
              description: log.description || log.maintenance_type || 'Maintenance performed',
              value: log.hours_at_service,
              unit: 'hours',
              performed_by: log.performed_by,
              completion_status: log.completion_status,
              metadata: { maintenance_type: log.maintenance_type }
            });
          }
        }
      }

      // Sort all logs by date descending
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return logs;
    }
  });
}
