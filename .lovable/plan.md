## Plan

1. **Reproduce the mobile state**
   - Open `/dashboard/referral` at Jocelyn-like mobile widths (360px and 390px).
   - Check whether the inline QR is clipped, whether all QR actions are reachable above the fixed bottom nav/help button, and whether the dialog opens.

2. **Fix the QR card layout for real phone heights**
   - Make the QR/action card use a single-column mobile layout with more conservative sizing so the full QR stays visible on narrow phones.
   - Ensure the action grid can scroll into view and is not hidden behind the mobile tab bar or floating help button.
   - Keep desktop/tablet layout unchanged.

3. **Make all QR options visible without relying on a stale row**
   - Keep every QR action in the mobile grid: Enlarge, Download PNG, Poster, Share QR page, Copy link, Public QR page, WhatsApp, SMS, Email, My QR page, and original admin QR when available.
   - Tighten labels/icons if needed so buttons do not clip on 360px screens.

4. **Address stale app/web caching after publish**
   - Inspect the service worker/update path and add a safer published-site refresh mechanism if needed so PWA/mobile Chrome users get the latest JS after a deploy.
   - Avoid caching navigations or old app shells that can keep Jocelyn on the previous broken QR screen.

5. **Verify**
   - Run a mobile browser check at 360px/390px for `/dashboard/referral`.
   - Confirm no horizontal overflow, QR fully visible, all options reachable, and Enlarge opens the zoom dialog.
   - If the issue is only from an installed PWA cache, document the expected one-time refresh behavior after the fix.