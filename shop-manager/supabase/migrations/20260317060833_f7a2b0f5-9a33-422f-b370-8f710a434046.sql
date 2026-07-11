
-- Seed default packaging types for all existing shops
INSERT INTO public.export_packaging_types (name, shop_id)
SELECT t.name, s.id
FROM public.shops s
CROSS JOIN (
  VALUES
    ('Vacuum Sealed Bag'),
    ('Cardboard Box'),
    ('Plastic Container'),
    ('Metal Can'),
    ('Wooden Crate'),
    ('Glass Jar'),
    ('Foil Pouch'),
    ('Woven Sack'),
    ('Shrink Wrap'),
    ('Drum')
) AS t(name)
ON CONFLICT DO NOTHING;

-- Auto-seed for new shops
CREATE OR REPLACE FUNCTION public.seed_default_packaging_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.export_packaging_types (name, shop_id)
  VALUES
    ('Vacuum Sealed Bag', NEW.id),
    ('Cardboard Box', NEW.id),
    ('Plastic Container', NEW.id),
    ('Metal Can', NEW.id),
    ('Wooden Crate', NEW.id),
    ('Glass Jar', NEW.id),
    ('Foil Pouch', NEW.id),
    ('Woven Sack', NEW.id),
    ('Shrink Wrap', NEW.id),
    ('Drum', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_packaging_types ON public.shops;
CREATE TRIGGER trg_seed_packaging_types
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_packaging_types();

-- Add DELETE RLS policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'export_packaging_types'
    AND policyname = 'Users can delete own shop packaging types'
  ) THEN
    CREATE POLICY "Users can delete own shop packaging types"
      ON public.export_packaging_types
      FOR DELETE
      TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
END;
$$;
