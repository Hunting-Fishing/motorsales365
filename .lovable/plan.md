## What is happening

Jocelyn’s phone is not seeing the newest published app shell. The source code already has the updated dashboard label and QR layout, but the published domain is still serving an older `/sw.js` service worker file. That old worker is an offline/app-shell cache path, so her browser/PWA can keep reusing old navigation and old QR code UI even after refresh or reopening.

## Goal

Make the published website behave like a normal live website: after a publish, users should get the newest navigation and QR layout, not an old cached app bundle.

## Plan

1. **Replace the stale offline service worker path**
   - Keep installability/home-screen support from the manifest.
   - Remove offline app-shell caching behavior for the main app.
   - Serve a same-path `/sw.js` cleanup worker for one release so devices with the old worker are forced to clear old app caches and unregister.

2. **Simplify the app update logic**
   - Remove the current “register a cleanup worker every build” loop from the React app.
   - Instead, on app load, unregister old `/sw.js` registrations and delete old Workbox/precache/offline caches.
   - Add a lightweight build-id check that reloads once when a user crosses from an older published build to a newer one.

3. **Add a visible internal version marker**
   - Add a tiny non-disruptive build marker in the DOM/data attribute so we can verify on a phone whether the newest bundle loaded.
   - This helps distinguish “published build not updated yet” from “device cache still serving old code.”

4. **Verify the actual QR/navigation state**
   - Check the current dashboard route source and mobile QR layout at phone size.
   - Confirm the current source shows `My referrals & status` and the constrained QR/actions layout.
   - After implementation, verify the published `/sw.js` response matches the cleanup worker once republished.

5. **User-facing guidance after publish**
   - Tell affected users to open the website once, wait for the automatic refresh, then reopen the PWA/app icon if they use it.
   - If an installed app was pinned while the old offline worker existed, one reinstall may still be needed on some phones, but the website should stop serving the old app shell after the cleanup release.

## Technical notes

- The published `/sw.js` currently differs from the repository file, so the last publish either did not include the latest cleanup file or the published app is still on an older release.
- The app should not use offline navigation caching unless offline support is explicitly required.
- The cleanup worker should delete only app-shell cache buckets and unregister itself, leaving normal browser HTTP caching to the host’s no-cache headers.