
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { CalendarEvent } from '@/types/calendar';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';

export type ModuleType = 'gunsmith' | 'power_washing' | 'marine' | 'fuel_delivery' | 'automotive' | 'default';

interface UseModuleCalendarEventsOptions {
  moduleType?: ModuleType;
  currentDate: Date;
  view: 'month' | 'week' | 'day';
}

export function useModuleCalendarEvents({ moduleType, currentDate, view }: UseModuleCalendarEventsOptions) {
  const location = useLocation();
  const { shopId } = useShopId();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Detect module from URL if not provided
  const detectedModule = useMemo((): ModuleType => {
    if (moduleType) return moduleType;
    
    const path = location.pathname;
    if (path.includes('/gunsmith')) return 'gunsmith';
    if (path.includes('/power-washing')) return 'power_washing';
    if (path.includes('/marine')) return 'marine';
    if (path.includes('/fuel-delivery')) return 'fuel_delivery';
    if (path.includes('/automotive')) return 'automotive';
    return 'default';
  }, [location.pathname, moduleType]);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (view) {
      case 'month':
        start = startOfWeek(startOfMonth(currentDate));
        end = endOfWeek(endOfMonth(currentDate));
        break;
      case 'week':
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        break;
      case 'day':
        start = currentDate;
        end = currentDate;
        break;
      default:
        start = subDays(currentDate, 7);
        end = addDays(currentDate, 7);
    }

    return { start, end };
  }, [currentDate, view]);

  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        let normalizedEvents: CalendarEvent[] = [];

        switch (detectedModule) {
          case 'gunsmith':
            normalizedEvents = await fetchGunsmithEvents(shopId, dateRange);
            break;
          case 'power_washing':
            normalizedEvents = await fetchPowerWashingEvents(shopId, dateRange);
            break;
          case 'marine':
          case 'fuel_delivery':
          case 'automotive':
          default:
            normalizedEvents = await fetchDefaultEvents(shopId, dateRange);
        }

        setEvents(normalizedEvents);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch events'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [shopId, detectedModule, dateRange.start.toISOString(), dateRange.end.toISOString()]);

  return { events, loading, error, moduleType: detectedModule };
}

// Fetch gunsmith appointments AND jobs
async function fetchGunsmithEvents(shopId: string, dateRange: { start: Date; end: Date }): Promise<CalendarEvent[]> {
  // Fetch appointments
  const { data: appointments, error: aptError } = await supabase
    .from('gunsmith_appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      appointment_type,
      assigned_to,
      duration_minutes,
      notes,
      status,
      customer:customers(first_name, last_name),
      technician:profiles!gunsmith_appointments_assigned_to_fkey(first_name, last_name)
    `)
    .eq('shop_id', shopId)
    .gte('appointment_date', dateRange.start.toISOString().split('T')[0])
    .lte('appointment_date', dateRange.end.toISOString().split('T')[0]);

  if (aptError) throw aptError;

  // Fetch jobs (work orders) - include received_date AND estimated_completion
  const { data: jobs, error: jobError } = await supabase
    .from('gunsmith_jobs')
    .select(`
      id,
      job_number,
      job_type,
      status,
      priority,
      received_date,
      estimated_completion,
      notes,
      customer:customers(first_name, last_name),
      technician:profiles!gunsmith_jobs_assigned_to_fkey(first_name, last_name)
    `)
    .eq('shop_id', shopId)
    .or(`received_date.gte.${dateRange.start.toISOString().split('T')[0]},estimated_completion.gte.${dateRange.start.toISOString().split('T')[0]}`)
    .or(`received_date.lte.${dateRange.end.toISOString().split('T')[0]},estimated_completion.lte.${dateRange.end.toISOString().split('T')[0]}`);

  if (jobError) throw jobError;

  // Convert appointments to calendar events
  const appointmentEvents: CalendarEvent[] = (appointments || []).map(apt => {
    const startTime = apt.appointment_time || '09:00';
    const endTime = calculateEndTime(startTime, apt.duration_minutes || 60);
    
    return {
      id: apt.id,
      title: apt.appointment_type || 'Gunsmith Appointment',
      start: `${apt.appointment_date}T${startTime}`,
      end: `${apt.appointment_date}T${endTime}`,
      customer: apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : undefined,
      technician: apt.technician ? `${apt.technician.first_name} ${apt.technician.last_name}` : undefined,
      status: apt.status || 'scheduled',
      type: 'appointment',
      color: getStatusColor(apt.status),
      description: apt.notes,
    };
  });

  // Convert jobs to calendar events - show on received_date
  const jobEvents: CalendarEvent[] = (jobs || []).map(job => {
    const jobDate = job.received_date || job.estimated_completion;
    
    return {
      id: job.id,
      title: `${job.job_type || 'Job'} - ${job.job_number}`,
      start: `${jobDate}T09:00`,
      end: `${jobDate}T17:00`,
      customer: job.customer ? `${job.customer.first_name} ${job.customer.last_name}` : undefined,
      technician: job.technician ? `${job.technician.first_name} ${job.technician.last_name}` : undefined,
      status: job.status || 'pending',
      priority: job.priority,
      type: 'work-order',
      color: getJobStatusColor(job.status),
      description: job.notes,
    };
  });

  return [...appointmentEvents, ...jobEvents];
}

// Helper to get color for job status
function getJobStatusColor(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'hsl(142, 71%, 45%)'; // Green
    case 'in_progress':
    case 'in-progress':
      return 'hsl(221, 83%, 53%)'; // Blue
    case 'pending':
      return 'hsl(38, 92%, 50%)'; // Amber/Orange
    case 'cancelled':
    case 'canceled':
      return 'hsl(0, 84%, 60%)'; // Red
    default:
      return 'hsl(38, 92%, 50%)'; // Amber default
  }
}

// Fetch power washing jobs/schedule
async function fetchPowerWashingEvents(shopId: string, dateRange: { start: Date; end: Date }): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('power_washing_jobs')
    .select(`
      id,
      job_number,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      property_address,
      property_type,
      status,
      priority,
      internal_notes,
      customer:customers(first_name, last_name)
    `)
    .eq('shop_id', shopId)
    .gte('scheduled_date', dateRange.start.toISOString().split('T')[0])
    .lte('scheduled_date', dateRange.end.toISOString().split('T')[0]);

  if (error) throw error;

  return (data || []).map(job => ({
    id: job.id,
    title: `${job.property_type || 'Power Washing'} - ${job.job_number}`,
    start: `${job.scheduled_date}T${job.scheduled_time_start || '09:00'}`,
    end: `${job.scheduled_date}T${job.scheduled_time_end || '17:00'}`,
    customer: job.customer ? `${job.customer.first_name} ${job.customer.last_name}` : undefined,
    status: job.status || 'scheduled',
    priority: job.priority,
    type: 'work-order',
    color: getStatusColor(job.status),
    description: job.internal_notes,
    location: job.property_address,
  }));
}

// Fetch default calendar events
async function fetchDefaultEvents(shopId: string, dateRange: { start: Date; end: Date }): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, status, event_type, description, location')
    .gte('start_time', dateRange.start.toISOString())
    .lte('start_time', dateRange.end.toISOString());

  if (error) throw error;

  return (data || []).map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    status: event.status || 'scheduled',
    type: event.event_type || 'event',
    color: getStatusColor(event.status),
    description: event.description,
    location: event.location,
  }));
}

// Helper to get color based on status
function getStatusColor(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'complete':
      return 'hsl(var(--success))';
    case 'in_progress':
    case 'in-progress':
      return 'hsl(var(--primary))';
    case 'cancelled':
    case 'canceled':
      return 'hsl(var(--destructive))';
    case 'pending':
    case 'scheduled':
    default:
      return 'hsl(var(--accent))';
  }
}

// Helper to calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}
