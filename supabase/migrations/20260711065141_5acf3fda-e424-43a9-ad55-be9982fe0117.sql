
-- Checklists library
CREATE TABLE public.buyer_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category_slug text,
  pdf_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buyer_checklists TO anon, authenticated;
GRANT ALL ON public.buyer_checklists TO service_role;
ALTER TABLE public.buyer_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active checklists"
  ON public.buyer_checklists FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins manage checklists"
  ON public.buyer_checklists FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Items
CREATE TABLE public.buyer_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.buyer_checklists(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  label text NOT NULL,
  hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX buyer_checklist_items_checklist_idx ON public.buyer_checklist_items(checklist_id, position);
GRANT SELECT ON public.buyer_checklist_items TO anon, authenticated;
GRANT ALL ON public.buyer_checklist_items TO service_role;
ALTER TABLE public.buyer_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view items of active checklists"
  ON public.buyer_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.buyer_checklists c WHERE c.id = checklist_id AND c.is_active = true));
CREATE POLICY "Admins manage checklist items"
  ON public.buyer_checklist_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-user, per-listing progress
CREATE TABLE public.buyer_checklist_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.buyer_checklist_items(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_checklist_progress TO authenticated;
GRANT ALL ON public.buyer_checklist_progress TO service_role;
ALTER TABLE public.buyer_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own checklist progress"
  ON public.buyer_checklist_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checklist progress"
  ON public.buyer_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own checklist progress"
  ON public.buyer_checklist_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER buyer_checklists_updated_at
  BEFORE UPDATE ON public.buyer_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: PH used-car checklist
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-car', 'PH buyer document checklist — Used car', 'cars')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', 'Ask for the latest LTO Official Receipt and Certificate of Registration.'),
  (2, 'Registered owner matches the seller''s valid ID', 'If not, ask for the open Deed of Sale chain and previous owner''s ID.'),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Seller can show 2 valid government IDs', NULL),
  (5, 'Chassis number matches the CR and the unit', NULL),
  (6, 'Engine number matches the CR and the unit', NULL),
  (7, 'Plate / conduction sticker matches the CR', NULL),
  (8, 'No encumbrance / chattel mortgage on the CR', 'If marked ''Encumbered,'' ask for the bank''s release of mortgage.'),
  (9, 'Flood, accident, and rebuild history disclosed in writing', NULL),
  (10, 'HPG / PNP clearance done (recommended for high-value units)', 'Highway Patrol Group macro-etching confirms the unit is not stolen.')
) AS v(position, label, hint);

-- Seed: PH used-motorcycle checklist (stub, admin can extend)
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-motorcycle', 'PH buyer document checklist — Motorcycle', 'motorcycles')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', NULL),
  (2, 'Registered owner matches the seller''s valid ID', NULL),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Chassis and engine numbers match the CR', NULL),
  (5, 'No encumbrance on the CR', NULL),
  (6, 'HPG clearance done (recommended)', NULL)
) AS v(position, label, hint);
