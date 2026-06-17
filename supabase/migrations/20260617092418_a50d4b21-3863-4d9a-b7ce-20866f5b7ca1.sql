-- Add assigned staff member to bookings
ALTER TABLE public.business_bookings
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_business_assigned
  ON public.business_bookings(business_id, assigned_user_id);

-- Allow the assigned staff member to view bookings assigned to them
DROP POLICY IF EXISTS "Assigned staff view bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff view bookings" ON public.business_bookings
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());

-- Allow the assigned staff member to update status on their bookings
DROP POLICY IF EXISTS "Assigned staff update bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff update bookings" ON public.business_bookings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());