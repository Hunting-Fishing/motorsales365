-- Create dedicated water_delivery_staff table for standalone water delivery staff management
CREATE TABLE public.water_delivery_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  job_title TEXT,
  department TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to auth profile if they have login
  is_active BOOLEAN NOT NULL DEFAULT true,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Unique email per shop (allows same email in different shops)
  UNIQUE(shop_id, email)
);

-- Create index for common queries
CREATE INDEX idx_water_delivery_staff_shop_id ON public.water_delivery_staff(shop_id);
CREATE INDEX idx_water_delivery_staff_email ON public.water_delivery_staff(email);
CREATE INDEX idx_water_delivery_staff_is_active ON public.water_delivery_staff(is_active);

-- Enable RLS
ALTER TABLE public.water_delivery_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for water_delivery_staff

-- Select: Users can view staff in their shop
CREATE POLICY "water_delivery_staff_select" ON public.water_delivery_staff
FOR SELECT TO authenticated
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Insert: Admins/Owners can create staff in their shop
CREATE POLICY "water_delivery_staff_insert" ON public.water_delivery_staff
FOR INSERT TO authenticated
WITH CHECK (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Update: Admins/Owners can update staff in their shop
CREATE POLICY "water_delivery_staff_update" ON public.water_delivery_staff
FOR UPDATE TO authenticated
USING (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Delete: Admins/Owners can delete staff in their shop
CREATE POLICY "water_delivery_staff_delete" ON public.water_delivery_staff
FOR DELETE TO authenticated
USING (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_water_delivery_staff_updated_at
  BEFORE UPDATE ON public.water_delivery_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create water_delivery_staff_roles junction table for role assignments
CREATE TABLE public.water_delivery_staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.water_delivery_staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(staff_id, role_id)
);

-- Enable RLS on junction table
ALTER TABLE public.water_delivery_staff_roles ENABLE ROW LEVEL SECURITY;

-- RLS for water_delivery_staff_roles - follows parent staff permissions
CREATE POLICY "water_delivery_staff_roles_select" ON public.water_delivery_staff_roles
FOR SELECT TO authenticated
USING (
  staff_id IN (
    SELECT ws.id FROM public.water_delivery_staff ws
    JOIN public.profiles p ON p.shop_id = ws.shop_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "water_delivery_staff_roles_insert" ON public.water_delivery_staff_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  staff_id IN (
    SELECT ws.id FROM public.water_delivery_staff ws
    JOIN public.profiles p ON p.shop_id = ws.shop_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "water_delivery_staff_roles_delete" ON public.water_delivery_staff_roles
FOR DELETE TO authenticated
USING (
  public.check_user_is_admin_or_owner(auth.uid()) AND
  staff_id IN (
    SELECT ws.id FROM public.water_delivery_staff ws
    JOIN public.profiles p ON p.shop_id = ws.shop_id
    WHERE p.id = auth.uid()
  )
);