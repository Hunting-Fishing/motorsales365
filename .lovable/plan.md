## Remove "Referral credit" language from the QR landing page

The hero section of the QR landing page currently says **"Referral credit"** and talks about keeping referral credit and counting stats. First-time scanners see this and feel like they've landed on a scam / MLM page. We need to reword everything to feel like a friendly introduction from a real person.

### Changes in `src/components/qr-landing-content.tsx`

1. **Hero eyebrow / label**
   - From: `"Referral credit"`
   - To: `"This QR spot"`

2. **Hero headline**
   - Preview mode: `"Your name will appear here when a visitor scans"` → `"Your name will appear here"`
   - Live mode: `"${referrer} brought you to 365 Motor Sales"` → `"This QR Code Spot brought to you by ${referrer}"`

3. **Hero body text**
   - Remove the sentence: `"This QR keeps … referral credit, but the page works like a shared featured destination …"`
   - Replace with a simple welcome line about 365 Motor Sales being a Philippines marketplace for vehicles, parts, and services.

4. **Contact / message line**
   - Replace `"Contact ${referrer}: [email]"` with:
     - `"Message them if you need assistance: [mailto:email link]"`
   - If no email is available, fall back to a generic `"Get help"` link pointing to `/contact`.

5. **Scan tracking badges (softened, not removed)**
   - `"New scan counted"` → `"First visit from this device"`
   - `"Repeat scan"` → `"Welcome back"`
   - Tooltip: remove `"counted toward ${referrer}'s stats"`, replace with `"First visit recorded"` / `"Thanks for stopping by again"`.

6. **Visit count banner**
   - Remove the sentence: `"Only the first scan counts toward stats."`
   - Keep the visit history itself ("You've opened this page X times since …").

7. **Preview banner**
   - `"Tracking, referral credit and lead submissions are disabled here"` → `"Tracking and lead submissions are disabled in preview mode."`

### No other changes
- All backend tracking (`record_qr_scan`, visit counts, promo fetching) stays exactly the same — only the UI copy changes.
- The `r.$code.tsx` route file does not change.
- Image lightbox, FAQ, roadmap, trust stats, and other sections below the hero remain untouched.