# Go-Live Batch 2 — Email + Storage Lockdown

Acting on your answers:
- **#1 Email sender domain**: `notify.365motorsales.com`
- **#2 Custom domain**: `www.365motorsales.com` (already configured, will verify)
- **#6 Storage lockdown**: restrict writes so users can only write under their own `user_id/` prefix in public buckets

Skipping for now (no answer yet): branded og:image (#3), analytics provider (#4), Sentry (#5), pg_cron schedules (#7) — happy to do those in the next batch.

---

## 1. Email infrastructure — `notify.365motorsales.com`

**Step 1 — Provision the sender domain**
Open the email setup dialog so you can add `notify.365motorsales.com` and Lovable can provision the NS delegation + DKIM/SPF/MX automatically.

**Step 2 — Set up the queue infrastructure**
Run `setup_email_infra` to create the pgmq queues, send log, suppression list, unsubscribe tokens, and the `process-email-queue` cron job. (The DB already has `enqueue_email`, `read_email_batch`, etc. from earlier work — this just ensures the dispatcher is wired.)

**Step 3 — Scaffold auth email templates**
Run `scaffold_auth_email_templates` so password reset, magic link, signup confirmation, email change, and reauthentication emails all come from `notify.365motorsales.com` with 365 MotorSales branding instead of the generic Lovable defaults.

**Step 4 — Wire transactional templates to the queue**
The existing templates in `src/lib/email-templates/` (signup-welcome, payment-receipt, ad-inquiry-*, refund-issued, subscription-*) are already registered. I'll confirm `src/routes/lovable/email/transactional/send.ts` uses the correct `SENDER_DOMAIN = "notify.365motorsales.com"` and the registry is complete.

**Step 5 — DNS / verification**
You'll need to add the NS records shown in the setup dialog at your domain registrar. Verification can take up to 72h but scaffolding doesn't need to wait — emails will start flowing automatically once DNS propagates. Status is visible in **Cloud → Emails**.

---

## 2. Custom domain verification (`www.365motorsales.com`)

The project URLs already list `www.365motorsales.com` and `365motorsales.com` as active custom domains, so this looks healthy. I'll just:
- Confirm both root + www are marked Active in Project Settings → Domains
- Update the root `og:image`, `canonical`, and any hardcoded `lovable.app` URLs in `__root.tsx` / sitemap / robots.txt to use `https://www.365motorsales.com` as the canonical origin

---

## 3. Storage bucket lockdown (per-user write prefix)

Public buckets today: `listing-photos`, `listing-videos`, `avatars`, `business-logos`, `qr-codes`. Private: `verification-docs`.

Tighten RLS on `storage.objects` so writes (INSERT / UPDATE / DELETE) require the first path segment to equal `auth.uid()`. Public SELECT stays open for public buckets so listings/avatars still render.

Migration sketch (one policy set per bucket):

```sql
-- Example for listing-photos (repeat per public bucket)
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;
CREATE POLICY "listing-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "listing-photos owner write" ON storage.objects;
CREATE POLICY "listing-photos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "listing-photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "listing-photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Applied to: `listing-photos`, `listing-videos`, `avatars`, `business-logos`, `qr-codes`.
For `qr-codes`, staff-generated QR codes go through a SECURITY DEFINER function or admin-only path, so I'll add an exception for admins via `has_role(auth.uid(),'admin')`.
`verification-docs` stays private with existing policies.

**Risk check before migrating**: I'll grep `src/lib/storage-upload.ts` and every upload call site to confirm all uploads already use a `${userId}/...` path prefix. If any path doesn't, I'll fix it in the same batch so the new policy doesn't break uploads.

---

## Order of execution

1. Show the email domain setup dialog → you add NS records
2. Run `setup_email_infra` + `scaffold_auth_email_templates` (no DNS wait needed)
3. Audit upload paths → migration to lock storage buckets
4. Update canonical URL / og config to `www.365motorsales.com`
5. Report back what's left for the next batch (og:image, analytics, Sentry, pg_cron)

Approve and I'll start with the email domain dialog.