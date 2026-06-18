## Goal

Make the **Add user** and **Edit user** flows consistent: same tab structure, same fields, same look. Persist first name / last name on create (currently only `full_name` is saved, which is why the edit dialog later shows them blank). Add an **Advertisements** tab to the edit dialog that drops the user's referral QR onto the existing Share-Kit templates.

## Tabs (identical in both dialogs)

1. **Identity** — Email*, First name*, Last name*, Full name (auto-fills from first+last but editable), Phone, Avatar. In Add: Temporary password lives here.
2. **Address** — Street, City, Province, Region, Postal code.
3. **Business** — Business name, Business kind, Business address/city/province/region/postal code, Seller type, Mark verified (Add) / Verification status (Edit).
4. **Roles & access** — Account type (Add only, hidden when `lockStaff`), Staff roles chips. Note: staff QR row auto-created.
5. **Advertisements** — Renders the share-kit templates with this user's referral code/QR baked in (reuses `TEMPLATES` from `src/lib/share-kit/templates.ts` + `TemplateCard`). Add dialog shows this tab disabled with "available after creation"; Edit dialog renders the live previews and download buttons. Allows quick selection of preset templates per user.

Tab strip uses shadcn `Tabs` with a wizard-style "Next / Back" footer on Add (Identity → Address → Business → Roles → Create) so admins fill sections in order; Edit is free-tab navigation with one "Save changes" footer.

## Database / server changes

- `src/routes/api/admin/create-user.tsx`: extend `Body` Zod schema with `first_name?`, `last_name?`, `phone?`, `street_address?`, `signup_city?`, `signup_province?`, `signup_region?`, `postal_code?`, `business_address?`, `business_city?`, `business_province?`, `business_region?`, `business_postal_code?`. Pass all provided values into the `profiles` upsert (alongside the existing `full_name`, `seller_type`, `business_name`, `business_kind`, `verification_status`). No new tables — all columns already exist on `profiles`.
- No migration needed (columns confirmed present in `profiles`, used by `EditProfileDialog` + `adminUpdateUserProfile`).

## Files to edit / add

- **Add** `src/components/admin/user-form-tabs.tsx` — shared field components used by both dialogs (IdentitySection, AddressSection, BusinessSection, RolesSection, AdvertisementsSection) so the two dialogs stay in lock-step.
- **Edit** `src/components/admin/add-user-dialog.tsx` — replace flat layout with `Tabs` + wizard footer, send the new fields to `/api/admin/create-user`.
- **Edit** `src/components/admin/edit-profile-dialog.tsx` — wrap existing sections in matching `Tabs`, add Advertisements tab. Keep current submit logic.
- **Edit** `src/routes/api/admin/create-user.tsx` — accept and persist the new profile fields.
- **Reuse** `src/lib/share-kit/templates.ts` + `src/components/share-kit/template-card.tsx` inside the Advertisements tab; pass the target user's referral code (look up `staff_referrals.code` for staff, otherwise `user_referrals.code`).

## Out of scope

- No changes to public sign-up form, no new role types, no new share-kit templates (only surfacing existing ones per-user), no email/Cloudflare routing changes.

## Acceptance

- Creating "Billy Bailey" via Add user persists `first_name=Billy`, `last_name=Bailey`, `full_name="Billy Bailey"` on `profiles`. Opening Edit immediately shows both populated.
- Both dialogs show the same 5 tabs with the same field labels and order.
- Edit → Advertisements lists the share-kit templates with the user's QR rendered, matching `/dashboard/share-kit`.
