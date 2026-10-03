-- Rewrite demo listing media URLs that pointed at the retired builder-hosted
-- asset CDN path (/__l5e/assets-v1/<uuid>/<file>). That path is only served by
-- the old hosting platform; on the self-hosted Cloudflare Worker it falls
-- through to the app router. The exact same image bytes now ship with the app
-- under public/demo-listings/<file>.
--
-- Idempotent: only touches rows that still use the legacy path.
update public.listing_media
set url = '/demo-listings/' || regexp_replace(url, '^.*/', '')
where url like '/__l5e/assets-v1/%'
  and regexp_replace(url, '^.*/', '') in (
    '180sx.jpg', 'ae86.jpg', 'celica.jpg', 'evo.jpg', 'r32.jpg',
    'rx7.jpg', 's13.jpg', 'supra.jpg', 'wrx.jpg', 'z32.jpg'
  );
