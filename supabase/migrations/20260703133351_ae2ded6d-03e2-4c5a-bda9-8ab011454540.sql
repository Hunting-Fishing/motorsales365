
-- ENUMS
CREATE TYPE public.club_type AS ENUM ('motorcycle_riding','car_club','off_road','truck_club','brand_owners','general_motoring','other');
CREATE TYPE public.club_status AS ENUM ('pending','active','rejected','suspended');
CREATE TYPE public.club_member_role AS ENUM ('owner','admin','member');
CREATE TYPE public.club_member_status AS ENUM ('pending','active','banned');
CREATE TYPE public.club_document_kind AS ENUM ('lto_accreditation','sec_incorporation','dti_business_permit','other');
CREATE TYPE public.club_event_status AS ENUM ('scheduled','cancelled','completed');
CREATE TYPE public.club_rsvp_response AS ENUM ('going','maybe','no');

-- CLUBS
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type public.club_type NOT NULL DEFAULT 'general_motoring',
  description text,
  region text,
  city text,
  logo_url text,
  cover_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  status public.club_status NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 1,
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clubs_status ON public.clubs(status);
CREATE INDEX idx_clubs_type ON public.clubs(type);
CREATE INDEX idx_clubs_owner ON public.clubs(owner_id);

GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- CLUB DOCUMENTS
CREATE TABLE public.club_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind public.club_document_kind NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_documents_club ON public.club_documents(club_id);

GRANT SELECT, INSERT, DELETE ON public.club_documents TO authenticated;
GRANT ALL ON public.club_documents TO service_role;
ALTER TABLE public.club_documents ENABLE ROW LEVEL SECURITY;

-- CLUB MEMBERS
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_member_role NOT NULL DEFAULT 'member',
  status public.club_member_status NOT NULL DEFAULT 'pending',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);

GRANT SELECT ON public.club_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- CLUB EVENTS
CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meetup_location text,
  meetup_lat double precision,
  meetup_lng double precision,
  cover_url text,
  status public.club_event_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_events_club ON public.club_events(club_id);
CREATE INDEX idx_club_events_starts_at ON public.club_events(starts_at);

GRANT SELECT ON public.club_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

-- EVENT RSVPs
CREATE TABLE public.club_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response public.club_rsvp_response NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_club_event_rsvps_event ON public.club_event_rsvps(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_rsvps TO authenticated;
GRANT ALL ON public.club_event_rsvps TO service_role;
ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- CLUB RIDES
CREATE TABLE public.club_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, ride_id)
);
CREATE INDEX idx_club_rides_club ON public.club_rides(club_id);

GRANT SELECT ON public.club_rides TO anon;
GRANT SELECT, INSERT, DELETE ON public.club_rides TO authenticated;
GRANT ALL ON public.club_rides TO service_role;
ALTER TABLE public.club_rides ENABLE ROW LEVEL SECURITY;

-- CLUB POSTS
CREATE TABLE public.club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_posts_club ON public.club_posts(club_id);

GRANT SELECT ON public.club_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_posts TO authenticated;
GRANT ALL ON public.club_posts TO service_role;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- HELPER: is_club_admin (owner or club admin role, active)
CREATE OR REPLACE FUNCTION public.is_club_admin(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user
      AND m.status = 'active' AND m.role IN ('owner','admin')
  );
$$;

-- HELPER: is_club_member (active member)
CREATE OR REPLACE FUNCTION public.is_club_member(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user AND m.status = 'active'
  );
$$;

-- POLICIES: clubs
CREATE POLICY "Public can read active clubs" ON public.clubs
  FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Owner and admins read own club" ON public.clubs
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply to create a club" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'pending');
CREATE POLICY "Owner and admins update club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes club" ON public.clubs
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_documents (private)
CREATE POLICY "Club admins read own docs" ON public.club_documents
  FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins insert docs" ON public.club_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR EXISTS (
      SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.owner_id = auth.uid()
    ))
  );
CREATE POLICY "Club admins delete docs" ON public.club_documents
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_members
CREATE POLICY "Public reads members of active clubs" ON public.club_members
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Users see own memberships" ON public.club_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User requests to join" ON public.club_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'member' AND status = 'pending');
CREATE POLICY "Club admins manage members" ON public.club_members
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User leaves or admin removes" ON public.club_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_events
CREATE POLICY "Public reads events for active clubs" ON public.club_events
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins manage events" ON public.club_events
  FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_event_rsvps
CREATE POLICY "Members read event rsvps" ON public.club_event_rsvps
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_events e
      WHERE e.id = event_id AND public.is_club_member(auth.uid(), e.club_id)
    )
  );
CREATE POLICY "User manages own rsvp" ON public.club_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own rsvp" ON public.club_event_rsvps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User deletes own rsvp" ON public.club_event_rsvps
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- POLICIES: club_rides
CREATE POLICY "Public reads rides on active clubs" ON public.club_rides
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Member attaches own ride" ON public.club_rides
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND public.is_club_member(auth.uid(), club_id)
    AND EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Member detaches own or admin removes" ON public.club_rides
  FOR DELETE TO authenticated
  USING (
    added_by = auth.uid()
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- POLICIES: club_posts
CREATE POLICY "Public reads posts of active clubs" ON public.club_posts
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins write posts" ON public.club_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Club admins update posts" ON public.club_posts
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins delete posts" ON public.club_posts
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- UPDATED_AT TRIGGERS
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_club_events_updated_at BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_club_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.club_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
      UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = NEW.club_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_club_members_count
  AFTER INSERT OR UPDATE OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_club_member_count();

-- AUTO OWNER MEMBERSHIP on club insert
CREATE OR REPLACE FUNCTION public.create_club_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now())
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clubs_owner_membership
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.create_club_owner_membership();
