CREATE OR REPLACE FUNCTION public.enforce_listing_media_caps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_listing_user uuid;
  v_listing_plan text;
  v_photo_count integer;
  v_video_count integer;
  v_photo_cap integer;
  v_video_cap integer;
BEGIN
  SELECT l.user_id, COALESCE(l.plan, 'free')
    INTO v_listing_user, v_listing_plan
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  IF v_listing_user IS NULL THEN
    RAISE EXCEPTION 'Listing not found'
      USING ERRCODE = '23503';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_listing_user THEN
    RAISE EXCEPTION 'Cannot attach media to another user''s listing'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.type = 'photo' THEN
    SELECT COUNT(*)
      INTO v_photo_count
    FROM public.listing_media
    WHERE listing_id = NEW.listing_id
      AND type = 'photo'
      AND id IS DISTINCT FROM NEW.id;

    v_photo_cap := CASE
      WHEN v_listing_plan IN ('standard', 'basic') THEN 5
      WHEN v_listing_plan IN ('upgraded', 'premium', 'dealer') THEN 20
      ELSE 12
    END;

    IF v_photo_count >= v_photo_cap THEN
      RAISE EXCEPTION 'Photo limit reached for % plan (max %)', v_listing_plan, v_photo_cap
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.type = 'video' THEN
    SELECT COUNT(*)
      INTO v_video_count
    FROM public.listing_media
    WHERE listing_id = NEW.listing_id
      AND type = 'video'
      AND id IS DISTINCT FROM NEW.id;

    v_video_cap := CASE
      WHEN v_listing_plan IN ('upgraded', 'premium', 'dealer') THEN 3
      ELSE 1
    END;

    IF v_video_count >= v_video_cap THEN
      RAISE EXCEPTION 'Video limit reached for % plan (max %)', v_listing_plan, v_video_cap
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;