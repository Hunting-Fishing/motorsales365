import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminUpdateUserProfile, adminGetOwnedBusinesses } from "@/lib/admin-profile.functions";
import { logAdminAudit, type AdminAuditEntry } from "@/lib/admin-audit";
import { Staff365Badge } from "@/components/admin/staff-365-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AddressSection,
  BusinessKindSelect,
  Field,
  RoleChips,
  STAFF_ROLES,
  compactInput,
  type StaffRole,
} from "@/components/admin/user-form-tabs";
import { UserAdvertisementsTab } from "@/components/admin/user-advertisements-tab";

type EditableUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  personal_email?: string | null;
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
  canEditRoles = false,
}: {
  user: EditableUser;
  onSaved?: () => void;
  is365Staff?: boolean;
  /** When false, the Roles tab is read-only. Only admin-role viewers can change roles. */
  canEditRoles?: boolean;
}) {
  const updateProfile = useServerFn(adminUpdateUserProfile);
  const getOwnedBusinesses = useServerFn(adminGetOwnedBusinesses);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("identity");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [ownedBiz, setOwnedBiz] = useState<{ id: string; name: string | null; slug: string | null }[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    personal_email: "",
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
  const [roles, setRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    if (!open) return;
    setTab("identity");
    setForm({
      full_name: user.full_name ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      email: "",
      personal_email: user.personal_email ?? "",
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
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOwnedBusinesses({ data: { targetUserId: user.id } })
      .then((res) => {
        if (!cancelled) setOwnedBiz(res.businesses ?? []);
      })
      .catch(() => {
        if (!cancelled) setOwnedBiz([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user.id, getOwnedBusinesses]);

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
      if (form.seller_type !== (user.seller_type ?? "private"))
        payload.seller_type = form.seller_type;
      if (form.verification_status !== (user.verification_status ?? "unverified"))
        payload.verification_status = form.verification_status;
      if (form.email.trim()) payload.email = form.email.trim();
      setIfDiff(
        "personal_email",
        form.personal_email.trim().toLowerCase() || null,
        (user.personal_email ?? "").toLowerCase() || null,
      );


      if (Object.keys(payload).length > 1) {
        await updateProfile({ data: payload });
      }

      if (canEditRoles) {
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
      }

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
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit user profile
            {is365Staff && <Staff365Badge size="sm" />}
          </DialogTitle>
          <DialogDescription>
            {user.full_name ?? "(no name)"} — identity, address, business, roles, and ad templates.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  className={compactInput()}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  className={compactInput()}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+639XXXXXXXXX"
                />
              </Field>
              <Field label="First name">
                <Input
                  className={compactInput()}
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </Field>
              <Field label="Last name">
                <Input
                  className={compactInput()}
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </Field>
              <Field label="Work email (auth login)">
                <Input
                  className={compactInput()}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={user.email ?? "leave blank to keep current"}
                />
              </Field>
              <Field label="Personal email">
                <Input
                  className={compactInput()}
                  type="email"
                  value={form.personal_email}
                  onChange={(e) => set("personal_email", e.target.value)}
                  placeholder="optional — personal contact"
                />
              </Field>
            </div>

            <Field label="Avatar">
              <div className="flex items-center gap-3">
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full border border-dashed border-border bg-muted" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={avatarUploading}
                  className={compactInput()}
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
            </Field>
          </TabsContent>

          <TabsContent value="address" className="mt-3">
            <AddressSection
              value={{
                street_address: form.street_address,
                signup_city: form.signup_city,
                signup_province: form.signup_province,
                signup_region: form.signup_region,
                postal_code: form.postal_code,
              }}
              onChange={(p) => setForm((s) => ({ ...s, ...p }))}
            />
          </TabsContent>

          <TabsContent value="business" className="mt-3 space-y-3">
            {ownedBiz.length === 1 ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                Linked business: <strong>{ownedBiz[0].name ?? "(unnamed)"}</strong> — name,
                address, city, province, region, postal code and kind are mirrored to the
                business page on save.{" "}
                {ownedBiz[0].slug && (
                  <a className="underline" href={`/s/${ownedBiz[0].slug}`} target="_blank" rel="noreferrer">
                    View page
                  </a>
                )}
              </div>
            ) : ownedBiz.length > 1 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                This user owns {ownedBiz.length} businesses — edits here only update the
                profile. Edit each business from its own Business page.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name">
                <Input
                  className={compactInput()}
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </Field>
              <Field label="Business kind">
                <BusinessKindSelect
                  value={form.business_kind}
                  onChange={(v) => set("business_kind", v)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Business address">
                  <Input
                    className={compactInput()}
                    value={form.business_address}
                    onChange={(e) => set("business_address", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Business city">
                <Input
                  className={compactInput()}
                  value={form.business_city}
                  onChange={(e) => set("business_city", e.target.value)}
                />
              </Field>
              <Field label="Business province">
                <Input
                  className={compactInput()}
                  value={form.business_province}
                  onChange={(e) => set("business_province", e.target.value)}
                />
              </Field>
              <Field label="Business region">
                <Input
                  className={compactInput()}
                  value={form.business_region}
                  onChange={(e) => set("business_region", e.target.value)}
                />
              </Field>
              <Field label="Business postal code">
                <Input
                  className={compactInput()}
                  value={form.business_postal_code}
                  onChange={(e) => set("business_postal_code", e.target.value)}
                />
              </Field>
              <Field label="Seller type">
                <Select
                  value={form.seller_type}
                  onValueChange={(v) => set("seller_type", v as any)}
                >
                  <SelectTrigger className={compactInput()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Verification">
                <Select
                  value={form.verification_status}
                  onValueChange={(v) => set("verification_status", v as any)}
                >
                  <SelectTrigger className={compactInput()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-3 space-y-2">
            <Field label="Staff roles">
              <RoleChips roles={roles} onToggle={toggleRole} disabled={!canEditRoles} />
            </Field>
            {canEditRoles ? (
              <p className="text-xs text-muted-foreground">Base &quot;user&quot; role is always kept.</p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Only accounts with the <strong>Admin</strong> role can change staff roles.
              </p>
            )}
          </TabsContent>

          <TabsContent value="ads" className="mt-3">
            <UserAdvertisementsTab
              userId={user.id}
              fullName={user.full_name ?? ""}
              email={user.email ?? null}
            />
          </TabsContent>
        </Tabs>

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
