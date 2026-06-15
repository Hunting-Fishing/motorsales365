import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminUpdateUserProfile } from "@/lib/admin-profile.functions";
import { logAdminAudit, type AdminAuditEntry } from "@/lib/admin-audit";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StaffRole = "admin" | "moderator" | "support" | "sales" | "advertising";
const STAFF_ROLES: StaffRole[] = ["admin", "moderator", "support", "sales", "advertising"];

type EditableUser = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  signup_city?: string | null;
  signup_region?: string | null;
  signup_province?: string | null;
  business_name?: string | null;
  business_kind?: string | null;
  business_address?: string | null;
  business_region?: string | null;
  business_province?: string | null;
  business_city?: string | null;
  business_postal_code?: string | null;
  seller_type?: string | null;
  verification_status?: string | null;
  roles?: string[];
};

export function EditProfileDialog({
  user,
  onSaved,
  is365Staff = false,
}: {
  user: EditableUser;
  onSaved?: () => void;
  is365Staff?: boolean;
}) {
  const updateProfile = useServerFn(adminUpdateUserProfile);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    avatar_url: "",
    street_address: "",
    postal_code: "",
    signup_city: "",
    signup_region: "",
    signup_province: "",
    business_name: "",
    business_kind: "" as string,
    business_address: "",
    business_region: "",
    business_province: "",
    business_city: "",
    business_postal_code: "",
    seller_type: "private" as "private" | "business",
    verification_status: "unverified" as "unverified" | "pending" | "verified" | "rejected",
  });
  const [originalEmail, setOriginalEmail] = useState("");
  const [roles, setRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      full_name: user.full_name ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      email: "",
      avatar_url: user.avatar_url ?? "",
      street_address: user.street_address ?? "",
      postal_code: user.postal_code ?? "",
      signup_city: user.signup_city ?? "",
      signup_region: user.signup_region ?? "",
      signup_province: user.signup_province ?? "",
      business_name: user.business_name ?? "",
      business_kind: (user.business_kind as any) ?? "",
      business_address: user.business_address ?? "",
      business_region: user.business_region ?? "",
      business_province: user.business_province ?? "",
      business_city: user.business_city ?? "",
      business_postal_code: user.business_postal_code ?? "",
      seller_type: (user.seller_type as any) ?? "private",
      verification_status: (user.verification_status as any) ?? "unverified",
    });
    setRoles(
      ((user.roles ?? []) as string[]).filter((r): r is StaffRole =>
        (STAFF_ROLES as string[]).includes(r),
      ),
    );
    setOriginalEmail("");
  }, [open, user]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const toggleRole = (r: StaffRole) =>
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      set("avatar_url", data.publicUrl);
      toast.success("Avatar uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      // 1. Profile + email server-side update.
      const payload: any = { targetUserId: user.id };
      const setIfDiff = (k: string, current: any, original: any) => {
        const a = current === "" ? null : current;
        const b = original === undefined || original === "" ? null : original;
        if (a !== b) payload[k] = a;
      };
      setIfDiff("full_name", form.full_name, user.full_name);
      setIfDiff("first_name", form.first_name, user.first_name);
      setIfDiff("last_name", form.last_name, user.last_name);
      setIfDiff("phone", form.phone, user.phone);
      setIfDiff("avatar_url", form.avatar_url, user.avatar_url);
      setIfDiff("street_address", form.street_address, user.street_address);
      setIfDiff("postal_code", form.postal_code, user.postal_code);
      setIfDiff("signup_city", form.signup_city, user.signup_city);
      setIfDiff("signup_region", form.signup_region, user.signup_region);
      setIfDiff("signup_province", form.signup_province, user.signup_province);
      setIfDiff("business_name", form.business_name, user.business_name);
      setIfDiff("business_kind", form.business_kind, user.business_kind);
      setIfDiff("business_address", form.business_address, user.business_address);
      setIfDiff("business_region", form.business_region, user.business_region);
      setIfDiff("business_province", form.business_province, user.business_province);
      setIfDiff("business_city", form.business_city, user.business_city);
      setIfDiff("business_postal_code", form.business_postal_code, user.business_postal_code);
      if (form.seller_type !== (user.seller_type ?? "private")) payload.seller_type = form.seller_type;
      if (form.verification_status !== (user.verification_status ?? "unverified"))
        payload.verification_status = form.verification_status;
      if (form.email.trim()) payload.email = form.email.trim();

      if (Object.keys(payload).length > 1) {
        await updateProfile({ data: payload });
      }

      // 2. Roles sync (client-side, RLS allows admin).
      const current = new Set<StaffRole>(
        ((user.roles ?? []) as string[]).filter((r): r is StaffRole =>
          (STAFF_ROLES as string[]).includes(r),
        ),
      );
      const next = new Set<StaffRole>(roles);
      const toAdd = [...next].filter((r) => !current.has(r));
      const toRemove = [...current].filter((r) => !next.has(r));
      if (toRemove.length) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .in("role", toRemove as any);
        if (error) throw error;
      }
      if (toAdd.length) {
        const rows = toAdd.map((role) => ({ user_id: user.id, role: role as any }));
        const { error } = await supabase.from("user_roles").insert(rows as any);
        if (error) throw error;
      }
      const auditRows: AdminAuditEntry[] = [];
      toAdd.forEach((r) =>
        auditRows.push({
          actor_id: "",
          target_user_id: user.id,
          action: "role_granted",
          field: "role",
          old_value: null,
          new_value: r,
        }),
      );
      toRemove.forEach((r) =>
        auditRows.push({
          actor_id: "",
          target_user_id: user.id,
          action: "role_revoked",
          field: "role",
          old_value: r,
          new_value: null,
        }),
      );
      if (auditRows.length) await logAdminAudit(auditRows);

      toast.success("Profile updated");
      onSaved?.();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit user profile</DialogTitle>
          <DialogDescription>
            {user.full_name ?? "(no name)"} — change identity, address, business, email, avatar,
            roles, and verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Identity</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>First name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+639XXXXXXXXX"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Email (change auth email)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="leave blank to keep current"
                />
              </div>
            </div>
          </section>

          {/* Avatar */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Avatar</h3>
            <div className="flex items-center gap-3">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="h-14 w-14 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-dashed border-border bg-muted" />
              )}
              <Input
                type="file"
                accept="image/*"
                disabled={avatarUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
              {form.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set("avatar_url", "")}
                >
                  Remove
                </Button>
              )}
            </div>
          </section>

          {/* Address */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Address</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Street address</Label>
                <Input
                  value={form.street_address}
                  onChange={(e) => set("street_address", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>City</Label>
                <Input
                  value={form.signup_city}
                  onChange={(e) => set("signup_city", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Province</Label>
                <Input
                  value={form.signup_province}
                  onChange={(e) => set("signup_province", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Region</Label>
                <Input
                  value={form.signup_region}
                  onChange={(e) => set("signup_region", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Postal code</Label>
                <Input
                  value={form.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Business */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Business</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Business name</Label>
                <Input
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Business kind</Label>
                <Select
                  value={form.business_kind || "none"}
                  onValueChange={(v) => set("business_kind", v === "none" ? "" : (v as any))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {BUSINESS_KIND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Business address</Label>
                <Input
                  value={form.business_address}
                  onChange={(e) => set("business_address", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Business city</Label>
                <Input
                  value={form.business_city}
                  onChange={(e) => set("business_city", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Business province</Label>
                <Input
                  value={form.business_province}
                  onChange={(e) => set("business_province", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Business region</Label>
                <Input
                  value={form.business_region}
                  onChange={(e) => set("business_region", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Business postal code</Label>
                <Input
                  value={form.business_postal_code}
                  onChange={(e) => set("business_postal_code", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Access */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Roles &amp; access</h3>
            <div className="grid gap-1.5">
              <Label>Staff roles</Label>
              <div className="flex flex-wrap gap-1.5">
                {STAFF_ROLES.map((r) => {
                  const on = roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {on ? "✓ " : "+ "}
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Seller type</Label>
                <Select
                  value={form.seller_type}
                  onValueChange={(v) => set("seller_type", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Verification</Label>
                <Select
                  value={form.verification_status}
                  onValueChange={(v) => set("verification_status", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || avatarUploading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
