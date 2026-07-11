## Goal
Make the QR area under **My referrals / status** usable on Jocelyn’s phone: the full QR must fit, pinch/enlarge must work, and all QR actions must be visible without being hidden by the bottom nav or cramped off-screen.

## Plan
1. **Tighten the mobile QR card**
   - Reduce the inline QR footprint on phones so the whole QR square fits inside the card instead of being cropped at the right edge.
   - Keep desktop/tablet sizing unchanged.
   - Add enough bottom padding so the bottom tab bar and floating help button do not cover PNG / Poster / sharing controls.

2. **Expose all QR options clearly**
   - Replace the cramped two-button row with a mobile-friendly action grid/stack:
     - Enlarge / pinch zoom
     - Download PNG with size choices
     - Poster / print
     - Share QR page
     - Copy referral link
     - Original admin download when available
   - Keep the existing linked QR ads / resources cards below the stats.

3. **Make zoom discoverable and reliable**
   - Add a clear visible **Enlarge** control on the QR itself.
   - Open the existing full-screen zoom dialog from that control.
   - Keep pinch, double-tap, plus/minus zoom controls inside the dialog.
   - Avoid nested button/dropdown interactions that can break tap or pinch behavior on mobile Chrome.

4. **Improve the “My referrals & status” navigation wording**
   - Rename the dashboard tab from **My referral & stats** to **My referrals & status** so it matches where users expect to find these QR tools.
   - Add **QR scan test** to the Promote & Earn navigation so all QR-related tools are accessible from the same dashboard menu.

5. **Verification**
   - Use the 360px mobile viewport and confirm `/dashboard/referral` shows the full QR and every QR option above the bottom tab bar.
   - Confirm tapping Enlarge opens the zoom dialog and the dialog controls remain available.
   - Confirm no horizontal overflow on the referral page.