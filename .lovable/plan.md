## What's broken

Two distinct issues showing in the console/network on `/resources/qr-landing`:

**1. React duplicate-key warning (spammed 4×)**
`src/routes/dashboard.tsx` lines 122–123 have the same tile listed twice in an array that uses `to` as its `key`:

```
{ to: "/resources/qr-landing", label: "Preview scanner view", Icon: QrCode },
{ to: "/resources/qr-landing", label: "Preview scanner view", Icon: QrCode },
```

React logs "Encountered two children with the same key, `/resources/qr-landing`".

**2. Supabase 400 – `column staff_referrals.user_id does not exist`**
`src/routes/dashboard.promoter-resources.tsx` line 201 queries the wrong column:

```
.from("staff_referrals").select("referral_code").eq("user_id", auth.user.id)
```

The real column is `staff_user_id` (used correctly everywhere else — `my-qr.tsx`, `dashboard.qr-scan-test.tsx`, `dashboard.tsx`, `dashboard.qr-ads.tsx`). The bad request returns HTTP 400 and the promoter never gets their referral code loaded on that page.

## Fixes

1. **`src/routes/dashboard.tsx`** — delete the duplicate tile on line 123 so the "Preview scanner view" card appears once.
2. **`src/routes/dashboard.promoter-resources.tsx`** — change `.eq("user_id", auth.user.id)` to `.eq("staff_user_id", auth.user.id)` on the `staff_referrals` query.

Then reload `/resources/qr-landing` and `/dashboard/promoter-resources` and confirm the console is clean and no more 400s on `staff_referrals`.

## Out of scope

No schema changes, no other routes touched, no visual redesign.