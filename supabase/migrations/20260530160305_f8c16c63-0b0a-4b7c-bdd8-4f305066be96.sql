
CREATE TABLE public.business_bookable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  duration_min INT NOT NULL DEFAULT 30,
  buffer_min INT NOT NULL DEFAULT 0,
  price_php NUMERIC(12,2),
  max_concurrent INT NOT NULL DEFAULT 1,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  lead_time_hours INT NOT NULL DEFAULT 2,
  horizon_days INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_bookable_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookable_items TO authenticated;
GRANT ALL ON public.business_bookable_items TO service_role;
ALTER TABLE public.business_bookable_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active bookable items" ON public.business_bookable_items FOR SELECT USING (active = true);
CREATE POLICY "Owners manage their bookable items" ON public.business_bookable_items FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookable_items.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookable_items.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_bookable_items_business ON public.business_bookable_items(business_id);

CREATE TABLE public.business_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_availability TO authenticated;
GRANT ALL ON public.business_availability TO service_role;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view availability" ON public.business_availability FOR SELECT USING (true);
CREATE POLICY "Owners manage availability" ON public.business_availability FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_availability_business ON public.business_availability(business_id);

CREATE TABLE public.business_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_availability_exceptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_availability_exceptions TO authenticated;
GRANT ALL ON public.business_availability_exceptions TO service_role;
ALTER TABLE public.business_availability_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view exceptions" ON public.business_availability_exceptions FOR SELECT USING (true);
CREATE POLICY "Owners manage exceptions" ON public.business_availability_exceptions FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability_exceptions.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability_exceptions.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_exceptions_business_date ON public.business_availability_exceptions(business_id, date);

CREATE TABLE public.business_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bookable_item_id UUID NOT NULL REFERENCES public.business_bookable_items(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  user_id UUID,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.business_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookings TO authenticated;
GRANT ALL ON public.business_bookings TO service_role;
ALTER TABLE public.business_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a booking" ON public.business_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view their bookings" ON public.business_bookings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE POLICY "Customers view their own bookings" ON public.business_bookings FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Owners update their bookings" ON public.business_bookings FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE POLICY "Owners delete bookings" ON public.business_bookings FOR DELETE
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_bookings_business_start ON public.business_bookings(business_id, starts_at);
CREATE INDEX idx_bookings_item_start ON public.business_bookings(bookable_item_id, starts_at);
CREATE INDEX idx_bookings_user ON public.business_bookings(user_id);

CREATE TRIGGER tg_bookable_items_updated_at BEFORE UPDATE ON public.business_bookable_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_bookings_updated_at BEFORE UPDATE ON public.business_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
