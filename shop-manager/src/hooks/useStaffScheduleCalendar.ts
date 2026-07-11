import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import { 
  StaffScheduleEvent, 
  StaffCalendarFilters, 
  EmployeeOption, 
  AssetOption,
  EMPLOYEE_COLORS,
  ASSET_TYPE_COLORS 
} from '@/types/staffScheduleCalendar';
import { startOfMonth, endOfMonth, addMonths, subMonths, parseISO, format } from 'date-fns';

interface WorkScheduleAssignment {
  id: string;
  employee_id: string;
  schedule_name: string;
  day_of_week: number;
  shift_start: string;
  shift_end: string;
  is_recurring: boolean;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface AssetAssignment {
  id: string;
  employee_id: string;
  asset_type: string;
  asset_id: string;
  assignment_start: string;
  assignment_end: string;
  purpose: string | null;
  notes: string | null;
  status: string;
  is_recurring: boolean;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export function useStaffScheduleCalendar(currentDate: Date) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<WorkScheduleAssignment[]>([]);
  const [assetAssignments, setAssetAssignments] = useState<AssetAssignment[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [vessels, setVessels] = useState<AssetOption[]>([]);
  const [equipment, setEquipment] = useState<AssetOption[]>([]);
  const [vehicles, setVehicles] = useState<AssetOption[]>([]);
  const [filters, setFilters] = useState<StaffCalendarFilters>({
    employeeIds: [],
    assetTypes: [],
    assetIds: [],
    statuses: [],
    searchQuery: '',
  });

  // Fetch all data
  useEffect(() => {
    if (shopId) {
      fetchAllData();
    }
  }, [shopId, currentDate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const dateRangeStart = format(subMonths(startOfMonth(currentDate), 1), 'yyyy-MM-dd');
      const dateRangeEnd = format(addMonths(endOfMonth(currentDate), 1), 'yyyy-MM-dd');

      await Promise.all([
        fetchSchedules(),
        fetchAssetAssignments(dateRangeStart, dateRangeEnd),
        fetchEmployees(),
        fetchAssets(),
      ]);
    } catch (error: any) {
      console.error('Error fetching staff schedule data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('work_schedule_assignments')
      .select(`
        *,
        profiles:employee_id(first_name, last_name)
      `)
      .eq('shop_id', shopId)
      .order('day_of_week');

    if (error) throw error;
    setSchedules(data as any || []);
  };

  const fetchAssetAssignments = async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('asset_assignments')
      .select(`
        *,
        profiles:employee_id(first_name, last_name)
      `)
      .eq('shop_id', shopId)
      .gte('assignment_start', startDate)
      .lte('assignment_end', endDate)
      .order('assignment_start');

    if (error) throw error;
    setAssetAssignments(data as any || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('shop_id', shopId);

    if (error) throw error;
    
    const employeeOptions: EmployeeOption[] = (data || []).map((emp, index) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`.trim() || 'Unknown',
      color: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length],
    }));
    
    setEmployees(employeeOptions);
  };

  const fetchAssets = async () => {
    // Fetch vessels from boat_inspections
    const { data: vesselData } = await (supabase
      .from('boat_inspections') as any)
      .select('id, vessel_name')
      .eq('shop_id', shopId);
    
    setVessels((vesselData || []).map((v: any) => ({
      id: v.id,
      name: v.vessel_name,
      type: 'vessel' as const,
    })));

    // Fetch equipment from equipment_assets
    const { data: equipmentData } = await (supabase
      .from('equipment_assets') as any)
      .select('id, name')
      .eq('shop_id', shopId);
    
    setEquipment((equipmentData || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      type: 'equipment' as const,
    })));

    // Fetch vehicles
    const { data: vehicleData } = await (supabase
      .from('vehicles') as any)
      .select('id, make, model, license_plate')
      .eq('shop_id', shopId);
    
    setVehicles((vehicleData || []).map((v: any) => ({
      id: v.id,
      name: `${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`,
      type: 'vehicle' as const,
    })));
  };

  // Get employee color by ID
  const getEmployeeColor = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.color || EMPLOYEE_COLORS[0];
  };

  // Get asset name by ID and type
  const getAssetName = (assetId: string, assetType: string): string => {
    if (assetType === 'vessel') {
      return vessels.find(v => v.id === assetId)?.name || 'Unknown Vessel';
    } else if (assetType === 'equipment') {
      return equipment.find(e => e.id === assetId)?.name || 'Unknown Equipment';
    } else if (assetType === 'vehicle') {
      return vehicles.find(v => v.id === assetId)?.name || 'Unknown Vehicle';
    }
    return 'Unknown Asset';
  };

  // Transform data into calendar events
  const events = useMemo((): StaffScheduleEvent[] => {
    const calendarEvents: StaffScheduleEvent[] = [];

    // Transform asset assignments into events
    assetAssignments.forEach((assignment) => {
      const employeeName = assignment.profiles 
        ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}`.trim()
        : 'Unknown';
      
      const assetType = assignment.asset_type as 'vessel' | 'equipment' | 'vehicle';
      const assetName = getAssetName(assignment.asset_id, assignment.asset_type);
      
      calendarEvents.push({
        id: assignment.id,
        title: `${assetName} - ${employeeName}`,
        start: parseISO(assignment.assignment_start),
        end: parseISO(assignment.assignment_end),
        type: `${assetType}_assignment` as any,
        employee: {
          id: assignment.employee_id,
          name: employeeName,
        },
        color: ASSET_TYPE_COLORS[assetType] || EMPLOYEE_COLORS[0],
        asset: {
          id: assignment.asset_id,
          name: assetName,
          type: assetType,
        },
        status: assignment.status,
        notes: assignment.notes || assignment.purpose,
        isRecurring: assignment.is_recurring,
      });
    });

    return calendarEvents;
  }, [assetAssignments, employees, vessels, equipment, vehicles]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Employee filter
      if (filters.employeeIds.length > 0 && !filters.employeeIds.includes(event.employee.id)) {
        return false;
      }

      // Asset type filter
      if (filters.assetTypes.length > 0 && event.asset) {
        if (!filters.assetTypes.includes(event.asset.type)) {
          return false;
        }
      }

      // Asset ID filter
      if (filters.assetIds.length > 0 && event.asset) {
        if (!filters.assetIds.includes(event.asset.id)) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
        return false;
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesEmployee = event.employee.name.toLowerCase().includes(query);
        const matchesAsset = event.asset?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesEmployee && !matchesAsset) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  return {
    loading,
    events: filteredEvents,
    allEvents: events,
    employees,
    vessels,
    equipment,
    vehicles,
    filters,
    setFilters,
    refetch: fetchAllData,
    getEmployeeColor,
  };
}
