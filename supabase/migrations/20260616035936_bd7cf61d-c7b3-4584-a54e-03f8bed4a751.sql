DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_bookings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_inquiries') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_inquiries';
  END IF;
END $$;
ALTER TABLE public.business_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.business_inquiries REPLICA IDENTITY FULL;