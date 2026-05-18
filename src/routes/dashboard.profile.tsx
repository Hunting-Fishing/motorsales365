import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type ChecklistItem = { label: string; done: boolean; required: boolean };

function buildChecklist(profile: any): ChecklistItem[] {
  const isBusiness = profile?.seller_type === "business" || profile?.seller_type === "dealer";
  const has = (v: any) => typeof v === "string" ? v.trim().length > 0 : !!v;
  const items: ChecklistItem[] = [
    { label: "Name", done: has(profile?.full_name) || (has(profile?.first_name) && has(profile?.last_name)), required: true },
    { label: "Phone number", done: has(profile?.phone) || has(profile?.phone_e164), required: true },
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

function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
  return null;
}

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Phone verification state
  const [phoneInput, setPhoneInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? {}));
  }, [user]);

  const sendPhoneOtp = async () => {
    const e164 = normalizePhPhone(phoneInput);
    if (!e164) return toast.error("Enter a valid PH phone number (e.g. 0917...)");
    setPhoneSubmitting(true);
    // Rate-limit: 3 sends per phone per hour
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
    const e164 = normalizePhPhone(phoneInput);
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
    setPhoneInput("");
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
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...profile });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (!profile) return <div>Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
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
          <Label>Full name</Label>
          <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
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
            Add a verified PH mobile number to recover your account by SMS if you lose access to your email.
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
              <Label htmlFor="phone-verify">PH mobile number</Label>
              <Input
                id="phone-verify"
                placeholder="09XX XXX XXXX"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Format: 09XX XXX XXXX or +63 9XX XXX XXXX.</p>
            </div>
            <Button onClick={sendPhoneOtp} disabled={phoneSubmitting} variant="secondary">
              {phoneSubmitting ? "Sending…" : "Send verification code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone-otp">6-digit code sent to {phoneInput}</Label>
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
