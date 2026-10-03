-- Visitor suggestions for Part Picks. A suggestion is a link, not a product.
-- Shoppers cannot publish. Admins turn a suggestion into a product later.
-- No policies: the anon key cannot read or write. Server functions use the service role.

create table if not exists public.shop_link_suggestions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text,
  status text not null default 'pending',
  product_id uuid references public.shop_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_link_suggestions_status_chk check (status in ('pending', 'added', 'dismissed'))
);

alter table public.shop_link_suggestions enable row level security;

drop trigger if exists trg_shop_link_suggestions_updated_at on public.shop_link_suggestions;
create trigger trg_shop_link_suggestions_updated_at
  before update on public.shop_link_suggestions
  for each row execute function public.set_updated_at();

create index if not exists idx_shop_link_suggestions_status
  on public.shop_link_suggestions (status, created_at desc);

grant select, insert, update, delete on public.shop_link_suggestions to service_role;
