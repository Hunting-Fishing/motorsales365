import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StaffRole = "admin" | "moderator" | "support" | "sales" | "advertising";
const STAFF_ROLES: StaffRole[] = ["admin", "moderator", "support", "sales", "advertising"];
type SellerType = "private" | "dealer" | "repair_shop" | "insurance";
type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export function EditUserDialog({
  user,
  onSaved,
}: {
  user: { id: string; full_name?: string | null; seller_type?: string | null; verification_status?: string | null; roles?: string[] };
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [sellerType, setSellerType] = useState<SellerType>("private");
  const [verification, setVerification] = useState<VerificationStatus>("unverified");

  useEffect(() => {
    if (!open) return;
    setRoles(((user.roles ?? []) as string[]).filter((r): r is StaffRole => (STAFF_ROLES as string[]).includes(r)));
    setSellerType(((user.seller_type as SellerType) ?? "private"));
    setVerification(((user.verification_status as VerificationStatus) ?? "unverified"));
  }, [open, user]);

  const toggleRole = (r: StaffRole) =>
    setRoles((cur) => cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);

  const submit = async () => {
    setSaving(true);
    try {
      // Sync roles: compute add/remove vs current
      const current = new Set(((user.roles ?? []) as string[]).filter((r) => (STAFF_ROLES as string[]).includes(r)));
      const next = new Set(roles);
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

      const profileUpdate: any = { seller_type: sellerType, verification_status: verification };
      profileUpdate.verified_at = verification === "verified" ? new Date().toISOString() : null;
      const { error: pErr } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
      if (pErr) throw pErr;

      toast.success("User updated");
      onSaved?.();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user.full_name ?? "(no name)"} — update roles, seller type, and verification.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
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
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {on ? "✓ " : "+ "}{r}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Base "user" role is always kept.</p>
          </div>

          <div className="grid gap-2">
            <Label>Seller type</Label>
            <Select value={sellerType} onValueChange={(v: any) => setSellerType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
                <SelectItem value="repair_shop">Repair shop</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Verification status</Label>
            <Select value={verification} onValueChange={(v: any) => setVerification(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
