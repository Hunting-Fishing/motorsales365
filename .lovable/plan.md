## Change `src/routes/resources.qr-landing.tsx`

1. Replace the "Promoter resources / QR Landing Preview" text header at the top with the `find-vehicles-parts-services-faster.png` 365 Motor Sales banner (the same hero banner already used inside `QrLandingContent`). Sized full-width but capped so it doesn't dominate (`max-h-48 sm:max-h-64`, `object-cover`, rounded), with the descriptive paragraph kept below it.
2. Remove the three promoter/admin buttons: "My QR & stats", "Print materials", and "Leads (admin)" — along with the now-unused `QrCode`, `Printer`, and `Users` lucide imports and the `Link` import if it becomes unused.
3. Keep the "Advertise with 365" button exactly as is.
4. Keep the three info cards below ("Where to place it", "How to introduce it", "What gets tracked") — they remain useful context.

No changes to `QrLandingContent` itself; the page body below the header is unchanged.
