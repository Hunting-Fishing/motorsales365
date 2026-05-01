import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? {}));
  }, [user]);

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
          </>
        )}
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
      </div>
    </div>
  );
}
