import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LocationPicker } from "@/components/location-picker";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import { AvatarUploader } from "@/components/avatar-uploader";
import { buildE164, parseE164 } from "@/data/country-codes";

type ChecklistItem = { label: string; done: boolean; required: boolean };

function buildChecklist(profile: any): ChecklistItem[] {
  const isBusiness = profile?.seller_type === "business" || profile?.seller_type === "dealer";
  const has = (v: any) => typeof v === "string" ? v.trim().length > 0 : !!v;
  const items: ChecklistItem[] = [
    { label: "First & last name", done: has(profile?.first_name) && has(profile?.last_name), required: true },
    { label: "Phone number", done: has(profile?.phone) || has(profile?.phone_e164), required: true },
    { label: "Profile photo", done: has(profile?.avatar_url), required: false },
    { label: "Verified phone (SMS recovery)", done: !!profile?.phone_verified_at, required: false },
  ];
  if (isBusiness) {
    items.push(
      { label: "Business name", done: has(profile?.business_name), required: true },
      { label: "Business address", done: has(profile?.business_address), required: true },
      { label: "Business location (region/province/city)", done: has(profile?.business_region) && has(profile?.business_province) && has(profile?.business_city), required: true },
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
  const [saving, setSaving] = useState(false);

  // Profile phone (country + national)
  const [profilePhone, setProfilePhone] = useState<{ iso: string; national: string }>({
    iso: "PH",
    national: "",
  });

  // Phone verification state
  const [verifyPhone, setVerifyPhone] = useState<{ iso: string; national: string }>({
    iso: "PH",
    national: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

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
      { emailRedirectTo: `${window.location.origin}/dashboard/profile` },
    );
    setEmailSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation links sent to both your current and new email. Click both to complete the change.");
    setNewEmail("");
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data ?? {});
      const seed = data?.phone_e164 || data?.phone || "";
      setProfilePhone(parseE164(seed));
    });
  }, [user]);

  const sendPhoneOtp = async () => {
    const e164 = buildE164(verifyPhone.iso, verifyPhone.national);
    if (!e164) return toast.error("Enter a valid phone number.");
    setPhoneSubmitting(true);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_send_log")
      .select("id", { count: "exact", head: true })
      .eq("phone", e164)
      .gte("sent_at", oneHourAgo);
    if ((count ?? 0) >= 3) {
      setPhoneSubmitting(false);
      return toast.error("Too many attempts. Try again in an hour.");
    }
    const { error } = await supabase.auth.updateUser({ phone: e164 });
    if (!error && user) {
      await supabase.from("otp_send_log").insert({ user_id: user.id, phone: e164, purpose: "verify" });
    }
    setPhoneSubmitting(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("OTP sent to your phone.");
  };

  const verifyPhoneOtp = async () => {
    const e164 = buildE164(verifyPhone.iso, verifyPhone.national);
    if (!e164 || !user) return;
    setPhoneSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otpCode, type: "phone_change" });
    if (!error) {
      await supabase.from("profiles").update({
        phone_e164: e164,
        phone_verified_at: new Date().toISOString(),
      }).eq("id", user.id);
      setProfile((p: any) => ({ ...p, phone_e164: e164, phone_verified_at: new Date().toISOString() }));
    }
    setPhoneSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Phone verified — recovery via SMS is now enabled.");
    setOtpSent(false);
    setOtpCode("");
    setVerifyPhone({ iso: "PH", national: "" });
  };

  const removePhone = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ phone_e164: null, phone_verified_at: null }).eq("id", user.id);
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
    const payload = {
      id: user.id,
      ...profile,
      first_name: first || null,
      last_name: last || null,
      full_name: full,
      phone: e164 ?? profile.phone ?? null,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setProfile(payload);
      toast.success("Profile saved");
    }
  };

  const initials = useMemo(() => {
    const f = (profile?.first_name ?? "").trim();
    const l = (profile?.last_name ?? "").trim();
    if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase() || "?";
    const fn = (profile?.full_name ?? "").trim();
    if (fn) return fn.split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
    return user?.email?.[0]?.toUpperCase() ?? "?";
  }, [profile, user]);

  if (!profile) return <div>Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
      <ProfileCompletion profile={profile} />
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
            value={profile.seller_type ?? "private"}
            onValueChange={(v) => setProfile({ ...profile, seller_type: v })}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
              <RadioGroupItem value="private" /> Private seller
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
              <RadioGroupItem value="business" /> Business seller
            </label>
          </RadioGroup>
        </div>
        {profile.seller_type === "business" && (
          <>
            <div>
              <Label>Business name</Label>
              <Input value={profile.business_name ?? ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} />
            </div>
            <div>
              <Label>Business address</Label>
              <Input value={profile.business_address ?? ""} onChange={(e) => setProfile({ ...profile, business_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="block">Business location</Label>
              <p className="text-xs text-muted-foreground">Based on the official PSA Philippine Standard Geographic Code.</p>
              <LocationPicker
                value={{
                  region: profile.business_region ?? null,
                  province: profile.business_province ?? null,
                  city: profile.business_city ?? null,
                  barangay: profile.business_barangay ?? null,
                }}
                onChange={(v) => setProfile({
                  ...profile,
                  business_region: v.region ?? null,
                  business_province: v.province ?? null,
                  business_city: v.city ?? null,
                  business_barangay: v.barangay ?? null,
                })}
              />
            </div>
          </>
        )}
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
      </div>

      {/* Security: phone verification */}
      <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Security — Phone verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a verified mobile number to recover your account by SMS if you lose access to your email.
          </p>
        </div>

        {profile.phone_verified_at && profile.phone_e164 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div>
              <div className="text-sm font-semibold">Verified: {profile.phone_e164}</div>
              <div className="text-xs text-muted-foreground">
                Verified {new Date(profile.phone_verified_at).toLocaleDateString()} — SMS recovery enabled.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={removePhone}>Remove</Button>
          </div>
        ) : !otpSent ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone-verify">Mobile number</Label>
              <PhoneInput
                id="phone-verify"
                iso={verifyPhone.iso}
                national={verifyPhone.national}
                onChange={setVerifyPhone}
              />
              <p className="mt-1 text-xs text-muted-foreground">Pick your country, then enter your mobile number.</p>
            </div>
            <Button onClick={sendPhoneOtp} disabled={phoneSubmitting} variant="secondary">
              {phoneSubmitting ? "Sending…" : "Send verification code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone-otp">
                6-digit code sent to {buildE164(verifyPhone.iso, verifyPhone.national)}
              </Label>
              <Input
                id="phone-otp"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyPhoneOtp} disabled={phoneSubmitting}>
                {phoneSubmitting ? "Verifying…" : "Verify"}
              </Button>
              <Button variant="ghost" onClick={() => { setOtpSent(false); setOtpCode(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCompletion({ profile }: { profile: any }) {
  const items = buildChecklist(profile);
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
          <div className="text-xs text-muted-foreground">{totalDone} of {items.length}</div>
        </div>
      </div>
      <Progress value={percent} className="mb-4 h-2" />
      {!isLive && isBusiness && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300">
            Your account isn't live yet. Add the missing required info below so drivers can find you.
          </span>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className={`size-4 shrink-0 ${item.required ? "text-amber-500" : "text-muted-foreground"}`} />
            )}
            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            {!item.done && !item.required && (
              <span className="text-xs text-muted-foreground">(optional)</span>
            )}
            {!item.done && item.required && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Required</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
