
ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS fulfilled_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_eta timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_message text;
