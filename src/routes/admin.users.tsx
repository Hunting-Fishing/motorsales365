import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatDate } from "@/lib/format";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [verFilter, setVerFilter] = useState<string>("all");

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    const ids = (profs ?? []).map((p) => p.id);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
    });
    setUsers((profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
  };
  useEffect(() => { load(); }, []);

  const STAFF_ROLES = ["admin", "moderator", "support", "sales", "advertising"] as const;
  type StaffRole = (typeof STAFF_ROLES)[number];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay = `${u.full_name ?? ""} ${u.business_name ?? ""} ${u.phone ?? ""} ${u.phone_e164 ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "all") {
        if (roleFilter === "user_only") {
          if ((u.roles ?? []).some((r: string) => (STAFF_ROLES as readonly string[]).includes(r))) return false;
        } else if (!u.roles?.includes(roleFilter)) return false;
      }
      if (sellerFilter !== "all" && u.seller_type !== sellerFilter) return false;
      if (verFilter !== "all" && (u.verification_status ?? "unverified") !== verFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, sellerFilter, verFilter]);

  const hasFilters = search || roleFilter !== "all" || sellerFilter !== "all" || verFilter !== "all";
  const clearFilters = () => { setSearch(""); setRoleFilter("all"); setSellerFilter("all"); setVerFilter("all"); };

  const toggleRole = async (userId: string, role: StaffRole, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`${role} revoked`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) return toast.error(error.message);
      toast.success(`${role} granted`);
    }
    load();
  };

  const verifyUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "verified", verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Marked verified"); load(); }
  };
  const revokeVerification = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "unverified", verified_at: null })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Verification revoked"); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <AddUserDialog onCreated={load} />
      </div>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong className="text-foreground">Users</strong> = create accounts and assign staff roles (admin, moderator, support, sales, advertising) or verify business accounts. For subscription, billing, and pause/ban controls use <strong className="text-foreground">Accounts</strong>.
        </div>
      </div>
      <div className="space-y-2">
        {users.map((u) => {
          const isVerified = u.verification_status === "verified";
          return (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <div className="flex items-center gap-1.5 font-medium">
                  {u.full_name ?? "(no name)"}
                  {isVerified && <VerifiedBadge size="sm" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.seller_type} · joined {formatDate(u.created_at)}
                  {u.verification_status && u.verification_status !== "unverified" && ` · ${u.verification_status}`}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {STAFF_ROLES.map((role) => {
                    const has = u.roles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRole(u.id, role, has)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                          has
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {has ? "✓ " : "+ "}{role}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EditUserDialog user={u} onSaved={load} />
                {isVerified
                  ? <Button size="sm" variant="outline" onClick={() => revokeVerification(u.id)}>Revoke verified</Button>
                  : <Button size="sm" variant="outline" onClick={() => verifyUser(u.id)}>Mark verified</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
