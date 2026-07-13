import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

// Types
export interface BookableService {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price: number | null;
  color: string;
  is_active: boolean;
  requires_equipment: boolean;
  equipment_type: string | null;
  max_concurrent_bookings: number;
  booking_notice_hours: number;
  cancellation_notice_hours: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffServiceAssignment {
  id: string;
  shop_id: string;
  employee_id: string;
  service_id: string;
  is_primary: boolean;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface BookingAppointment {
  id: string;
  shop_id: string;
  customer_id: string | null;
  service_id: string | null;
  employee_id: string | null;
  equipment_id: string | null;
  equipment_type: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  booked_by: string | null;
  booked_via: 'online' | 'phone' | 'walk_in' | 'staff';
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  bookable_services?: BookableService;
  customers?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface BookingWaitlist {
  id: string;
  shop_id: string;
  customer_id: string;
  service_id: string | null;
  preferred_employee_id: string | null;
  preferred_date: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  flexibility: 'exact' | 'flexible' | 'any';
  status: 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled';
  priority: number;
  notes: string | null;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  customers?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
  bookable_services?: BookableService;
}

export interface BookingSettings {
  id: string;
  shop_id: string;
  allow_online_booking: boolean;
  require_confirmation: boolean;
  allow_same_day_booking: boolean;
  min_booking_notice_hours: number;
  max_advance_booking_days: number;
  slot_interval_minutes: number;
  default_buffer_minutes: number;
  allow_waitlist: boolean;
  auto_confirm: boolean;
  send_confirmation_email: boolean;
  send_reminder_email: boolean;
  reminder_hours_before: number;
  cancellation_policy: string | null;
  booking_instructions: string | null;
}

// Hooks
export function useBookableServices() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['bookable-services', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookable_services')
        .select('*')
        .eq('shop_id', shopId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as BookableService[];
    },
    enabled: !!shopId,
  });
}

export function useActiveBookableServices() {
  return useQuery({
    queryKey: ['bookable-services-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookable_services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as BookableService[];
    },
  });
}

export function useCreateBookableService() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (service: { name: string; description?: string | null; category?: string | null; duration_minutes?: number; buffer_minutes?: number; price?: number | null; color?: string; is_active?: boolean; requires_equipment?: boolean; equipment_type?: string | null; booking_notice_hours?: number; cancellation_notice_hours?: number }) => {
      const { data, error } = await supabase
        .from('bookable_services')
        .insert({
          name: service.name,
          shop_id: shopId,
          description: service.description,
          category: service.category,
          duration_minutes: service.duration_minutes ?? 60,
          buffer_minutes: service.buffer_minutes ?? 0,
          price: service.price,
          color: service.color ?? '#3B82F6',
          is_active: service.is_active ?? true,
          requires_equipment: service.requires_equipment ?? false,
          equipment_type: service.equipment_type,
          booking_notice_hours: service.booking_notice_hours ?? 24,
          cancellation_notice_hours: service.cancellation_notice_hours ?? 24,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookable-services'] });
      toast.success('Service created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create service: ' + error.message);
    },
  });
}

export function useUpdateBookableService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookableService> & { id: string }) => {
      const { data, error } = await supabase
        .from('bookable_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookable-services'] });
      toast.success('Service updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update service: ' + error.message);
    },
  });
}

export function useDeleteBookableService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bookable_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookable-services'] });
      toast.success('Service deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete service: ' + error.message);
    },
  });
}

// Booking Appointments
export function useBookingAppointments(dateRange?: { start: Date; end: Date }) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['booking-appointments', shopId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('booking_appointments')
        .select(`
          *,
          bookable_services (*),
          customers (id, first_name, last_name, email, phone)
        `)
        .eq('shop_id', shopId)
        .order('start_time', { ascending: true });

      if (dateRange?.start) {
        query = query.gte('start_time', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        query = query.lte('start_time', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch employee profiles separately if needed
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (apt) => {
          if (apt.employee_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('id', apt.employee_id)
              .single();
            return { ...apt, profiles: profile };
          }
          return { ...apt, profiles: null };
        })
      );
      
      return appointmentsWithProfiles as BookingAppointment[];
    },
    enabled: !!shopId,
  });
}

export function useCreateBookingAppointment() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (booking: { customer_id?: string | null; service_id?: string | null; employee_id?: string | null; equipment_id?: string | null; equipment_type?: string | null; start_time: string; end_time: string; status?: string; notes?: string | null; customer_notes?: string | null; internal_notes?: string | null; booked_via?: string }) => {
      const { data, error } = await supabase
        .from('booking_appointments')
        .insert({
          shop_id: shopId,
          customer_id: booking.customer_id,
          service_id: booking.service_id,
          employee_id: booking.employee_id,
          equipment_id: booking.equipment_id,
          equipment_type: booking.equipment_type,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status ?? 'pending',
          notes: booking.notes,
          customer_notes: booking.customer_notes,
          internal_notes: booking.internal_notes,
          booked_via: booking.booked_via ?? 'staff',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-appointments'] });
      toast.success('Booking created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create booking: ' + error.message);
    },
  });
}

export function useUpdateBookingAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingAppointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-appointments'] });
      toast.success('Booking updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update booking: ' + error.message);
    },
  });
}

export function useCancelBookingAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('booking_appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userData.user?.id,
          cancellation_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-appointments'] });
      toast.success('Booking cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel booking: ' + error.message);
    },
  });
}

// Waitlist
export function useBookingWaitlist() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['booking-waitlist', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_waitlist')
        .select(`
          *,
          customers (id, first_name, last_name, email, phone),
          bookable_services (*)
        `)
        .eq('shop_id', shopId)
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BookingWaitlist[];
    },
    enabled: !!shopId,
  });
}

export function useAddToWaitlist() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (entry: Partial<BookingWaitlist>) => {
      const { data, error } = await supabase
        .from('booking_waitlist')
        .insert({ ...entry, shop_id: shopId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-waitlist'] });
      toast.success('Added to waitlist');
    },
    onError: (error) => {
      toast.error('Failed to add to waitlist: ' + error.message);
    },
  });
}

export function useUpdateWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingWaitlist> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_waitlist')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-waitlist'] });
      toast.success('Waitlist updated');
    },
    onError: (error) => {
      toast.error('Failed to update waitlist: ' + error.message);
    },
  });
}

// Staff Service Assignments
export function useStaffServiceAssignments(serviceId?: string) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['staff-service-assignments', shopId, serviceId],
    queryFn: async () => {
      let query = supabase
        .from('staff_service_assignments')
        .select(`
          *,
          profiles:employee_id (id, first_name, last_name, email)
        `)
        .eq('shop_id', shopId);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StaffServiceAssignment[];
    },
    enabled: !!shopId,
  });
}

// Booking Settings
export function useBookingSettings() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['booking-settings', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;
      return data as BookingSettings | null;
    },
    enabled: !!shopId,
  });
}

export function useUpdateBookingSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (settings: Partial<BookingSettings>) => {
      const { data: existing } = await supabase
        .from('booking_settings')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('booking_settings')
          .update(settings)
          .eq('shop_id', shopId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('booking_settings')
          .insert({ ...settings, shop_id: shopId })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] });
      toast.success('Booking settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}

// Availability check helper
export function useCheckAvailability() {
  return useMutation({
    mutationFn: async ({
      serviceId,
      employeeId,
      startTime,
      endTime,
      excludeBookingId,
    }: {
      serviceId?: string;
      employeeId?: string;
      startTime: Date;
      endTime: Date;
      excludeBookingId?: string;
    }) => {
      let query = supabase
        .from('booking_appointments')
        .select('id')
        .neq('status', 'cancelled')
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString());

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return {
        isAvailable: data.length === 0,
        conflictCount: data.length,
      };
    },
  });
}
