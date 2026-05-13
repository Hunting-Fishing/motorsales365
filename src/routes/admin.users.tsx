import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Info, Search, X } from "lucide-react";
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

const STAFF_ROLES = ["admin", "moderator", "support", "sales", "advertising"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
const PAGE_SIZE = 50;

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [verFilter, setVerFilter] = useState<string>("all");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to first page when filters change
  useEffect(() => { setPage(0); }, [roleFilter, sellerFilter, verFilter]);

  const load = async () => {
    setLoading(true);
    try {
      // Resolve role filter to a user_id allow/deny list first
      let restrictIds: string[] | null = null;
      let excludeIds: string[] | null = null;
      if (roleFilter !== "all") {
        if (roleFilter === "user_only") {
          const { data: staffRows } = await supabase
            .from("user_roles")
            .select("user_id")
            .in("role", STAFF_ROLES as unknown as any);
          excludeIds = Array.from(new Set((staffRows ?? []).map((r: any) => r.user_id)));
        } else {
          const { data: roleRows } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", roleFilter as any);
          restrictIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
          if (restrictIds.length === 0) {
            setUsers([]); setTotal(0); setLoading(false); return;
          }
        }
      }

      let q = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (restrictIds) q = q.in("id", restrictIds);
      if (excludeIds && excludeIds.length > 0) q = q.not("id", "in", `(${excludeIds.join(",")})`);
      if (sellerFilter !== "all") q = q.eq("seller_type", sellerFilter as any);
      if (verFilter !== "all") {
        if (verFilter === "unverified") {
          q = q.or("verification_status.is.null,verification_status.eq.unverified");
        } else {
          q = q.eq("verification_status", verFilter as any);
        }
      }
      if (search.trim()) {
        const s = search.trim().replace(/[%,()]/g, "");
        q = q.or(
          `full_name.ilike.%${s}%,business_name.ilike.%${s}%,phone.ilike.%${s}%,phone_e164.ilike.%${s}%`
        );
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: profs, count, error } = await q.range(from, to);
      if (error) { toast.error(error.message); setLoading(false); return; }

      const ids = (profs ?? []).map((p) => p.id);
      let roleMap = new Map<string, string[]>();
      if (ids.length > 0) {
        const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
        (roles ?? []).forEach((r: any) => {
          const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
        });
      }
      setUsers((profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, roleFilter, sellerFilter, verFilter]);

  const hasFilters = search || roleFilter !== "all" || sellerFilter !== "all" || verFilter !== "all";
  const clearFilters = () => {
    setSearchInput(""); setSearch("");
    setRoleFilter("all"); setSellerFilter("all"); setVerFilter("all");
    setPage(0);
  };

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

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

      <div className="mb-4 grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, business, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user_only">Standard users only</SelectItem>
            {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger><SelectValue placeholder="Seller type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All seller types</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="repair_shop">Repair shop</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verFilter} onValueChange={setVerFilter}>
          <SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verification</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{loading ? "Loading…" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}</span>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />Clear filters
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {!loading && users.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No users match these filters.
          </div>
        )}
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

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="mr-1 h-4 w-4" />Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
