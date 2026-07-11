
## Problem

Screenshot is from `/dashboard/referral` (the `MyQrCard` block in `src/routes/dashboard.referral.tsx`), not `/my-qr`. On a ~360px phone:

1. The inline QR renders at ~full card width, pushing the name, PNG/Poster buttons and "Download original (admin)" link partly under the fixed bottom tab bar (Home/Browse/Sell/Inbox/Account).
2. The "Tap anywhere to enlarge" hint chip sits below the QR and gets clipped, so users don't discover the zoom dialog.
3. Pinch-zoom doesn't work on the inline QR — zoom only exists inside the dialog (`ZoomableQr`). Users try to pinch the visible QR and nothing happens.
4. The card has no bottom safe-area padding, so the mobile bottom nav overlaps its footer.

## Fix (mobile-only, presentation layer)

Edit only `src/routes/dashboard.referral.tsx` (`MyQrCard`) and, if needed, `src/components/qr/zoomable-qr.tsx` props.

1. Cap the inline QR on small screens
   - Wrap the QR square in `max-w-[78vw] sm:max-w-none mx-auto` so it doesn't consume the whole viewport width.
   - Keep `aspect-square` and existing ring styling.

2. Prevent bottom-nav overlap
   - Add `pb-[max(env(safe-area-inset-bottom),5rem)] sm:pb-4` to the outer card wrapper so the PNG/Poster row and "Download original (admin)" link clear the fixed bottom tab bar.

3. Make the inline QR pinch-zoomable in place
   - Wrap the inline `ResponsiveQr` in `ZoomableQr` (same component already used in the dialog) with `enablePan={false}` on mobile so a single pinch scales the QR without hijacking page scroll; the existing `DialogTrigger` button still opens the full-screen view when tapped without a pinch.
   - Because `ZoomableQr` must live inside a `button` today, split the trigger: render the QR square as a `div` with the zoom gesture handlers, and add a small "Enlarge" button (Maximize2 icon) in the corner that opens the dialog. This removes the nested-interactive-element issue and lets pinch work.

4. Make the enlarge affordance obvious on mobile
   - Move the "Tap to enlarge" chip from below the QR to an always-visible pill on top of the QR (top-right, `bg-black/70 text-white`) so it isn't clipped when the card is tall.
   - Keep the existing chip text below on `sm:` and up.

5. No backend, RLS, data or business-logic changes. `/my-qr` is not touched.

## Verification

- Set preview viewport to mobile (360×640) and confirm on `/dashboard/referral`:
  - Full card (QR, name, PNG, Poster, Download original link) is visible above the bottom tab bar without scrolling into it.
  - Pinch on the inline QR scales it in place; the page doesn't zoom.
  - Tapping the Enlarge pill (or the QR area) opens the existing full-screen dialog with `ZoomableQr` still working.
- Desktop (`sm:` and up) layout is unchanged.
