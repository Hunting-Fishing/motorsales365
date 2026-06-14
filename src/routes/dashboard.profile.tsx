import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LocationPicker } from "@/components/location-picker";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import { AvatarUploader } from "@/components/avatar-uploader";
import { TotpSetupCard } from "@/components/totp-setup-card";
import { buildE164, parseE164 } from "@/data/country-codes";
import { useCurrency } from "@/lib/currency";
import { saveProfile } from "@/lib/profile.functions";
import { siteOrigin } from "@/lib/site-config";

type ChecklistItem = { label: string; done: boolean; required: boolean };

function buildChecklist(profile: any, totpEnabled: boolean): ChecklistItem[] {
  const isBusiness = profile?.seller_type === "business" || profile?.seller_type === "dealer";
  const isStaff = profile?.seller_type === "staff";
  const has = (v: any) => (typeof v === "string" ? v.trim().length > 0 : !!v);
  const items: ChecklistItem[] = [
    {
      label: "First & last name",
      done: has(profile?.first_name) && has(profile?.last_name),
      required: true,
    },
    {
      label: "Phone number",
      done: has(profile?.phone) || has(profile?.phone_e164),
      required: true,
    },
    { label: "Profile photo", done: has(profile?.avatar_url), required: false },
    { label: "Two-factor authentication (authenticator app)", done: totpEnabled, required: !isStaff },
  ];
  if (isStaff) {
    // Staff don't need business fields; require 2FA instead.
    items[items.length - 1].required = true;
  }
  if (isBusiness) {
    items.push(
      { label: "Business name", done: has(profile?.business_name), required: true },
      { label: "Business address", done: has(profile?.business_address), required: true },
      {
        label: "Business location (region/province/city)",
        done:
          has(profile?.business_region) &&
          has(profile?.business_province) &&
          has(profile?.business_city),
        required: true,
      },
    );
  }
  return items;
}

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const isStaffEmail = (user?.email ?? "").toLowerCase().endsWith("@365motorsales.com");

  // Profile phone (country + national)
  const [profilePhone, setProfilePhone] = useState<{ iso: string; national: string }>({
    iso: "PH",
    national: "",
  });

  // (Phone-verification SMS flow removed — replaced with TOTP 2FA below.)

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const requestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newEmail.trim().toLowerCase();
    if (!target || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      return toast.error("Enter a valid email address.");
    }
    if (user && target === user.email?.toLowerCase()) {
      return toast.error("That's already your current email.");
    }
    setEmailSubmitting(true);
    const { error } = await supabase.auth.updateUser(
      { email: target },
      { emailRedirectTo: `${siteOrigin()}/dashboard/profile` },
    );
    setEmailSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(
      "Confirmation links sent to both your current and new email. Click both to complete the change.",
    );
    setNewEmail("");
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? {});
        const seed = data?.phone_e164 || data?.phone || "";
        setProfilePhone(parseE164(seed));
      });
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = (data?.totp ?? []).some((f: any) => f.status === "verified");
      setTotpEnabled(verified);
    });
  }, [user]);

  const removePhone = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ phone_e164: null, phone_verified_at: null })
      .eq("id", user.id);
    setProfile((p: any) => ({ ...p, phone_e164: null, phone_verified_at: null }));
    toast.success("Phone removed.");
  };

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const e164 = buildE164(profilePhone.iso, profilePhone.national);
    const first = (profile.first_name ?? "").trim();
    const last = (profile.last_name ?? "").trim();
    const full = [first, last].filter(Boolean).join(" ") || profile.full_name || null;
    try {
      const { profile: saved } = await saveProfile({
        data: {
          first_name: first || null,
          last_name: last || null,
          full_name: full,
          phone: e164 ?? profile.phone ?? null,
          phone_e164: e164 ?? profile.phone_e164 ?? null,
          avatar_url: profile.avatar_url ?? null,
          seller_type: profile.seller_type ?? null,
          business_name: profile.business_name ?? null,
          business_address: profile.business_address ?? null,
          business_region: profile.business_region ?? null,
          business_province: profile.business_province ?? null,
          business_city: profile.business_city ?? null,
          business_barangay: profile.business_barangay ?? null,
        },
      });
      setProfile(saved ?? { ...profile, first_name: first, last_name: last, full_name: full });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = useMemo(() => {
    const f = (profile?.first_name ?? "").trim();
    const l = (profile?.last_name ?? "").trim();
    if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase() || "?";
    const fn = (profile?.full_name ?? "").trim();
    if (fn)
      return fn
        .split(/\s+/)
        .map((s: string) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    return user?.email?.[0]?.toUpperCase() ?? "?";
  }, [profile, user]);

  if (!profile) return <div>Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
      <ProfileCompletion profile={profile} totpEnabled={totpEnabled} />
      {profile.is_founding_member && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <span className="text-2xl">✨</span>
          <div>
            <div className="font-semibold text-amber-700 dark:text-amber-300">
              Founding Member #{profile.founding_member_number}
            </div>
            <div className="text-xs text-muted-foreground">
              You're one of our first 1,000 users. Lifetime Bronze tier on us — thank you!
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label className="mb-2 block">Profile photo</Label>
          {user && (
            <AvatarUploader
              userId={user.id}
              value={profile.avatar_url ?? null}
              fallback={initials}
              onChange={(url) => setProfile({ ...profile, avatar_url: url })}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              autoComplete="given-name"
              value={profile.first_name ?? ""}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              autoComplete="family-name"
              value={profile.last_name ?? ""}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Phone</Label>
          <PhoneInput
            iso={profilePhone.iso}
            national={profilePhone.national}
            onChange={setProfilePhone}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Pick your country code, then enter your number. Stored as international format.
          </p>
        </div>
        <div>
          <Label className="mb-2 block">Default seller type</Label>
          <RadioGroup
            value={profile.seller_type ?? (isStaffEmail ? "staff" : "private")}
            onValueChange={(v) => setProfile({ ...profile, seller_type: v })}
            className={`grid gap-2 ${isStaffEmail ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
              <RadioGroupItem value="private" /> Private seller
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
              <RadioGroupItem value="business" /> Business seller
            </label>
            {isStaffEmail && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 p-3">
                <RadioGroupItem value="staff" />
                <span>
                  365 Motor Sales staff
                  <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    Team
                  </span>
                </span>
              </label>
            )}
          </RadioGroup>
          {isStaffEmail && (
            <p className="mt-2 text-xs text-muted-foreground">
              Detected a <code>@365motorsales.com</code> email — choose <strong>Staff</strong> if you're
              on the team. You'll skip the private/business buyer-seller fields and use your team
              permissions instead.
            </p>
          )}
        </div>
        {profile.seller_type === "business" && (
          <>
            <div>
              <Label>Business name</Label>
              <Input
                value={profile.business_name ?? ""}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Business address</Label>
              <Input
                value={profile.business_address ?? ""}
                onChange={(e) => setProfile({ ...profile, business_address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="block">Business location</Label>
              <p className="text-xs text-muted-foreground">
                Based on the official PSA Philippine Standard Geographic Code.
              </p>
              <LocationPicker
                value={{
                  region: profile.business_region ?? null,
                  province: profile.business_province ?? null,
                  city: profile.business_city ?? null,
                  barangay: profile.business_barangay ?? null,
                }}
                onChange={(v) =>
                  setProfile({
                    ...profile,
                    business_region: v.region ?? null,
                    business_province: v.province ?? null,
                    business_city: v.city ?? null,
                    business_barangay: v.barangay ?? null,
                  })
                }
              />
            </div>
          </>
        )}
        {profile.seller_type === "staff" && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <div className="font-medium text-foreground">Internal team account</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your access to admin tools, promotions, advertising, and customer discounts is managed
              from the Admin panel by an owner. You don't need to fill in business details here.
            </p>
          </div>
        )}
        <FormFeedbackLink formId="profile-edit" className="mt-2" />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <CurrencyPreferenceCard />

      {/* Account email */}
      <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Account email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your sign-in email. Changing it sends a confirmation link to both your current and new
            addresses — click both to complete.
          </p>
        </div>
        <div>
          <Label>Current email</Label>
          <Input value={user?.email ?? ""} disabled readOnly />
        </div>
        <form onSubmit={requestEmailChange} className="space-y-3">
          <div>
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={emailSubmitting}>
            {emailSubmitting ? "Sending…" : "Send confirmation links"}
          </Button>
        </form>
      </div>

      {/* Security: TOTP two-factor authentication (free, no SMS) */}
      <TotpSetupCard />
    </div>
  );
}

function CurrencyPreferenceCard() {
  const { code, setCode, currencies, current, loading, format } = useCurrency();
  const sample = 1_250_000; // ₱1.25M — representative listing price
  return (
    <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-bold">Display currency</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All listings are priced in Philippine Peso (₱). Pick a display currency to see live
          conversions alongside the listed price across the site.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="currency-pref">Preferred display currency</Label>
          <select
            id="currency-pref"
            value={code}
            disabled={loading}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Preview</div>
          <div className="mt-0.5 font-semibold">
            ₱{sample.toLocaleString()} <span className="text-xs text-muted-foreground">PHP</span>
          </div>
          {code !== "PHP" && current.rate_to_php > 0 && (
            <div className="text-xs text-muted-foreground">
              ≈ <span className="font-semibold text-foreground">{format(sample)}</span> (1{" "}
              {current.code} ≈ ₱
              {current.rate_to_php.toLocaleString("en-US", { maximumFractionDigits: 2 })})
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Conversions are indicative only. All transactions are billed in PHP.
      </p>
    </div>
  );
}

function ProfileCompletion({ profile, totpEnabled }: { profile: any; totpEnabled: boolean }) {
  const items = buildChecklist(profile, totpEnabled);
  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.done).length;
  const totalDone = items.filter((i) => i.done).length;
  const percent = Math.round((totalDone / items.length) * 100);
  const missingRequired = required.length - requiredDone;
  const isLive = missingRequired === 0;
  const isBusiness = profile?.seller_type === "business" || profile?.seller_type === "dealer";

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Profile completion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLive
              ? isBusiness
                ? "Your business profile is complete and eligible to be listed."
                : "Your profile is complete."
              : `Complete ${missingRequired} required item${missingRequired === 1 ? "" : "s"} ${isBusiness ? "to go live in the directory" : "to finish setup"}.`}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold">{percent}%</div>
          <div className="text-xs text-muted-foreground">
            {totalDone} of {items.length}
          </div>
        </div>
      </div>
      <Progress value={percent} className="mb-4 h-2" />
      {!isLive && isBusiness && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300">
            Your account isn't live yet. Add the missing required info below so drivers can find
            you.
          </span>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle
                className={`size-4 shrink-0 ${item.required ? "text-amber-500" : "text-muted-foreground"}`}
              />
            )}
            <span className={item.done ? "text-muted-foreground line-through" : ""}>
              {item.label}
            </span>
            {!item.done && !item.required && (
              <span className="text-xs text-muted-foreground">(optional)</span>
            )}
            {!item.done && item.required && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Required
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
