
CREATE OR REPLACE FUNCTION public.enforce_listing_media_caps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_photo_cap int;
  v_video_cap int;
  v_count int;
  is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(plan::text, 'free') INTO v_plan
    FROM public.listings WHERE id = NEW.listing_id;

  IF v_plan = 'upgraded' THEN
    v_photo_cap := 20; v_video_cap := 3;
  ELSIF v_plan = 'standard' THEN
    v_photo_cap := 5;  v_video_cap := 1;
  ELSE
    v_photo_cap := 1;  v_video_cap := 0;
  END IF;

  IF NEW.type = 'photo' THEN
    SELECT count(*) INTO v_count FROM public.listing_media
      WHERE listing_id = NEW.listing_id AND type = 'photo';
    IF v_count >= v_photo_cap THEN
      RAISE EXCEPTION 'Photo limit reached for % plan (max %).', v_plan, v_photo_cap
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.type = 'video' THEN
    SELECT count(*) INTO v_count FROM public.listing_media
      WHERE listing_id = NEW.listing_id AND type = 'video';
    IF v_count >= v_video_cap THEN
      RAISE EXCEPTION 'Video limit reached for % plan (max %).', v_plan, v_video_cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_listing_media_caps ON public.listing_media;
CREATE TRIGGER trg_enforce_listing_media_caps
BEFORE INSERT ON public.listing_media
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_media_caps();
