-- =============================================
-- JANE-STYLE BOOKING SYSTEM TABLES
-- =============================================

-- Bookable services (Service Menu)
CREATE TABLE public.bookable_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_minutes INTEGER DEFAULT 0,
  price DECIMAL(10,2),
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  requires_equipment BOOLEAN DEFAULT false,
  equipment_type TEXT,
  max_concurrent_bookings INTEGER DEFAULT 1,
  booking_notice_hours INTEGER DEFAULT 24,
  cancellation_notice_hours INTEGER DEFAULT 24,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff/technician service assignments (who can perform what)
CREATE TABLE public.staff_service_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.bookable_services(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

-- Booking appointments (main booking table)
CREATE TABLE public.booking_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.bookable_services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipment_id UUID,
  equipment_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  customer_notes TEXT,
  internal_notes TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  booked_by UUID REFERENCES public.profiles(id),
  booked_via TEXT DEFAULT 'online' CHECK (booked_via IN ('online', 'phone', 'walk_in', 'staff')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking waitlist
CREATE TABLE public.booking_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.bookable_services(id) ON DELETE SET NULL,
  preferred_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  flexibility TEXT DEFAULT 'flexible' CHECK (flexibility IN ('exact', 'flexible', 'any')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'expired', 'cancelled')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  notified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking reminders
CREATE TABLE public.booking_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.booking_appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment availability blocks (for equipment reservations)
CREATE TABLE public.equipment_booking_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('equipment', 'vehicle', 'vessel')),
  booking_id UUID REFERENCES public.booking_appointments(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking settings per shop
CREATE TABLE public.booking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  allow_online_booking BOOLEAN DEFAULT true,
  require_confirmation BOOLEAN DEFAULT true,
  allow_same_day_booking BOOLEAN DEFAULT true,
  min_booking_notice_hours INTEGER DEFAULT 2,
  max_advance_booking_days INTEGER DEFAULT 90,
  slot_interval_minutes INTEGER DEFAULT 15,
  default_buffer_minutes INTEGER DEFAULT 15,
  allow_waitlist BOOLEAN DEFAULT true,
  auto_confirm BOOLEAN DEFAULT false,
  send_confirmation_email BOOLEAN DEFAULT true,
  send_reminder_email BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  cancellation_policy TEXT,
  booking_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_bookable_services_shop ON public.bookable_services(shop_id);
CREATE INDEX idx_bookable_services_active ON public.bookable_services(is_active) WHERE is_active = true;
CREATE INDEX idx_staff_service_assignments_employee ON public.staff_service_assignments(employee_id);
CREATE INDEX idx_staff_service_assignments_service ON public.staff_service_assignments(service_id);
CREATE INDEX idx_booking_appointments_shop ON public.booking_appointments(shop_id);
CREATE INDEX idx_booking_appointments_customer ON public.booking_appointments(customer_id);
CREATE INDEX idx_booking_appointments_employee ON public.booking_appointments(employee_id);
CREATE INDEX idx_booking_appointments_time ON public.booking_appointments(start_time, end_time);
CREATE INDEX idx_booking_appointments_status ON public.booking_appointments(status);
CREATE INDEX idx_booking_waitlist_shop ON public.booking_waitlist(shop_id);
CREATE INDEX idx_booking_waitlist_status ON public.booking_waitlist(status) WHERE status = 'waiting';
CREATE INDEX idx_equipment_booking_blocks_equipment ON public.equipment_booking_blocks(equipment_id, equipment_type);
CREATE INDEX idx_equipment_booking_blocks_time ON public.equipment_booking_blocks(start_time, end_time);

-- Enable RLS
ALTER TABLE public.bookable_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_booking_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookable_services (public read for customers, shop-based write)
CREATE POLICY "Anyone can view active bookable services" ON public.bookable_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Shop members can manage bookable services" ON public.bookable_services
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for staff_service_assignments
CREATE POLICY "Shop members can view staff assignments" ON public.staff_service_assignments
  FOR SELECT USING (public.user_belongs_to_shop(auth.uid(), shop_id));

CREATE POLICY "Shop members can manage staff assignments" ON public.staff_service_assignments
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for booking_appointments
CREATE POLICY "Customers can view their own bookings" ON public.booking_appointments
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
    OR public.user_belongs_to_shop(auth.uid(), shop_id)
  );

CREATE POLICY "Customers can create bookings" ON public.booking_appointments
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
    OR public.user_belongs_to_shop(auth.uid(), shop_id)
  );

CREATE POLICY "Shop members can manage bookings" ON public.booking_appointments
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for booking_waitlist
CREATE POLICY "Customers can view their waitlist entries" ON public.booking_waitlist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
    OR public.user_belongs_to_shop(auth.uid(), shop_id)
  );

CREATE POLICY "Customers can join waitlist" ON public.booking_waitlist
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
    OR public.user_belongs_to_shop(auth.uid(), shop_id)
  );

CREATE POLICY "Shop members can manage waitlist" ON public.booking_waitlist
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for booking_reminders
CREATE POLICY "Shop members can manage reminders" ON public.booking_reminders
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for equipment_booking_blocks
CREATE POLICY "Shop members can manage equipment blocks" ON public.equipment_booking_blocks
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- RLS Policies for booking_settings
CREATE POLICY "Shop members can view booking settings" ON public.booking_settings
  FOR SELECT USING (public.user_belongs_to_shop(auth.uid(), shop_id));

CREATE POLICY "Shop admins can manage booking settings" ON public.booking_settings
  FOR ALL USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- Updated_at trigger function (reuse existing or create)
CREATE OR REPLACE FUNCTION public.update_booking_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_bookable_services_updated_at
  BEFORE UPDATE ON public.bookable_services
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

CREATE TRIGGER update_booking_appointments_updated_at
  BEFORE UPDATE ON public.booking_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

CREATE TRIGGER update_booking_waitlist_updated_at
  BEFORE UPDATE ON public.booking_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

-- Enable realtime for booking appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_appointments;
ALTER TABLE public.booking_appointments REPLICA IDENTITY FULL;