
CREATE TABLE public.business_page_events (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'view','call_click','whatsapp_click','messenger_click','website_click',
    'contact_click','share_click','book_click','book_created','book_confirmed',
    'inquiry_submitted','gallery_view','video_play'
  )),
  meta JSONB,
  session_hash TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bpe_business_time ON public.business_page_events (business_id, occurred_at DESC);
CREATE INDEX idx_bpe_business_kind_time ON public.business_page_events (business_id, kind, occurred_at DESC);

GRANT SELECT ON public.business_page_events TO authenticated;
GRANT ALL ON public.business_page_events TO service_role;

ALTER TABLE public.business_page_events ENABLE ROW LEVEL SECURITY;

-- Owner / org member can read events for their business
CREATE POLICY "Owners read business events"
ON public.business_page_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_page_events.business_id
      AND (
        b.owner_id = auth.uid()
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);
-- All writes happen via service_role inside server functions (no public insert policy needed).
