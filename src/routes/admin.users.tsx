import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Eye, Info, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatDate } from "@/lib/format";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { EditProfileDialog } from "@/components/admin/edit-profile-dialog";
import { Staff365Badge } from "@/components/admin/staff-365-badge";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { logAdminAudit } from "@/lib/admin-audit";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { generateStaffMagicLink } from "@/lib/admin-magic-link.functions";
import { listStaffUserIds } from "@/lib/admin-staff.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";
const STAFF_DOMAIN = "@365motorsales.com";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const STAFF_ROLES = ["admin", "moderator", "support", "sales", "advertising"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

function AdminUsers() {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const canEditRoles = isAdmin || isSuperAdmin;
  const genMagicLink = useServerFn(generateStaffMagicLink);
  const fetchStaffIds = useServerFn(listStaffUserIds);
  const [staffIds, setStaffIds] = useState<Set<string>>(new Set());
  const [magicLink, setMagicLink] = useState<{ email: string; link: string } | null>(null);
  const [magicLoadingId, setMagicLoadingId] = useState<string | null>(null);

  // Load 365motorsales.com staff user IDs once for filtering + eye button gating.
  useEffect(() => {
    let cancelled = false;
    (fetchStaffIds as any)()
      .then((res: { ids: string[] }) => {
        if (!cancelled) setStaffIds(new Set(res.ids));
      })
      .catch(() => {
        // Non-admins / errors: ignore silently.
      });
    return () => {
      cancelled = true;
    };
  }, [fetchStaffIds]);

  const handleViewLogin = async (u: any) => {
    setMagicLoadingId(u.id);
    try {
      const res = await genMagicLink({ data: { targetUserId: u.id } });
      setMagicLink({ email: res.email, link: res.actionLink });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate sign-in link");
    } finally {
      setMagicLoadingId(null);
    }
  };

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [pageInput, setPageInput] = useState("");
  const [loading, setLoading] = useState(false);


  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [verFilter, setVerFilter] = useState<string>("all");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [roleFilter, sellerFilter, verFilter]);

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
            setUsers([]);
            setTotal(0);
            setLoading(false);
            return;
          }
        }
      }

      let q = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (restrictIds) q = q.in("id", restrictIds);
      if (excludeIds && excludeIds.length > 0) q = q.not("id", "in", `(${excludeIds.join(",")})`);
      if (sellerFilter === "staff_365") {
        const ids = Array.from(staffIds);
        if (ids.length === 0) {
          setUsers([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        q = q.in("id", ids);
      } else if (sellerFilter !== "all") {
        q = q.eq("seller_type", sellerFilter as any);
      }
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
          `full_name.ilike.%${s}%,business_name.ilike.%${s}%,phone.ilike.%${s}%,phone_e164.ilike.%${s}%`,
        );
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data: profs, count, error } = await q.range(from, to);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const ids = (profs ?? []).map((p) => p.id);
      const roleMap = new Map<string, string[]>();
      if (ids.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id,role")
          .in("user_id", ids);
        (roles ?? []).forEach((r: any) => {
          const arr = roleMap.get(r.user_id) ?? [];
          arr.push(r.role);
          roleMap.set(r.user_id, arr);
        });
      }
      setUsers((profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // reason: `load` is recreated each render; depend only on its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, roleFilter, sellerFilter, verFilter, staffIds]);
  useEffect(() => {
    setPage(0);
  }, [pageSize]);

  const hasFilters =
    search || roleFilter !== "all" || sellerFilter !== "all" || verFilter !== "all";
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setSellerFilter("all");
    setVerFilter("all");
    setPage(0);
  };

  const toggleRole = async (userId: string, role: StaffRole, has: boolean) => {
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) return toast.error(error.message);
      await logAdminAudit({
        actor_id: "",
        target_user_id: userId,
        action: "role_revoked",
        field: "role",
        old_value: role,
        new_value: null,
      });
      toast.success(`${role} revoked`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) return toast.error(error.message);
      await logAdminAudit({
        actor_id: "",
        target_user_id: userId,
        action: "role_granted",
        field: "role",
        old_value: null,
        new_value: role,
      });
      toast.success(`${role} granted`);
    }
    load();
  };

  const verifyUser = async (userId: string, prev?: string | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "verified", verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      await logAdminAudit({
        actor_id: "",
        target_user_id: userId,
        action: "verification_changed",
        field: "verification_status",
        old_value: prev ?? "unverified",
        new_value: "verified",
      });
      toast.success("Marked verified");
      load();
    }
  };
  const revokeVerification = async (userId: string, prev?: string | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "unverified", verified_at: null })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      await logAdminAudit({
        actor_id: "",
        target_user_id: userId,
        action: "verification_changed",
        field: "verification_status",
        old_value: prev ?? "verified",
        new_value: "unverified",
      });
      toast.success("Verification revoked");
      load();
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(total, (page + 1) * pageSize);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AddUserDialog onCreated={load} />
          {isSuperAdmin && (
            <AddUserDialog
              onCreated={load}
              lockStaff
              enforceDomain={STAFF_DOMAIN}
              triggerLabel="Create Employee"
            />
          )}
        </div>
      </div>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong className="text-foreground">Users</strong> = create accounts and assign staff
          roles (admin, moderator, support, sales, advertising) or verify business accounts. For
          subscription, billing, and pause/ban controls use{" "}
          <strong className="text-foreground">Accounts</strong>.
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
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user_only">Standard users only</SelectItem>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Seller type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All seller types</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="repair_shop">Repair shop</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="staff_365">365 Staff</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verFilter} onValueChange={setVerFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
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
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
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
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-1.5 font-medium">
                  {u.full_name ?? "(no name)"}
                  {isVerified && <VerifiedBadge size="sm" />}
                  {staffIds.has(u.id) && <Staff365Badge size="xs" className="ml-1" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.seller_type} · joined {formatDate(u.created_at)}
                  {u.verification_status &&
                    u.verification_status !== "unverified" &&
                    ` · ${u.verification_status}`}
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
                        {has ? "✓ " : "+ "}
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin && staffIds.has(u.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    title="Get one-time sign-in link (365motorsales.com staff only)"
                    disabled={magicLoadingId === u.id}
                    onClick={() => handleViewLogin(u)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    {magicLoadingId === u.id ? "…" : "Sign-in link"}
                  </Button>
                )}
                <EditProfileDialog user={u} onSaved={load} is365Staff={staffIds.has(u.id)} />
                {isSuperAdmin && <ResetPasswordDialog user={u} />}
                {isVerified ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revokeVerification(u.id, u.verification_status)}
                  >
                    Revoke verified
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyUser(u.id, u.verification_status)}
                  >
                    Mark verified
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => setPage(0)}
            >
              First
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage(totalPages - 1)}
            >
              Last
            </Button>
          </div>
          <form
            className="flex items-center gap-2 text-xs text-muted-foreground"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (!isNaN(n) && n >= 1 && n <= totalPages) {
                setPage(n - 1);
                setPageInput("");
              } else toast.error(`Enter a page between 1 and ${totalPages}`);
            }}
          >
            <span>Jump to</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder={String(page + 1)}
              className="h-8 w-20"
            />
            <Button size="sm" variant="outline" type="submit">
              Go
            </Button>
          </form>
        </div>
      )}

      <Dialog open={!!magicLink} onOpenChange={(o) => !o && setMagicLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One-time sign-in link</DialogTitle>
            <DialogDescription>
              Send this link to <strong>{magicLink?.email}</strong>. Opening it
              signs them in without a password. The link can only be used once
              and expires shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-2 text-xs break-all">
            {magicLink?.link}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!magicLink) return;
                await navigator.clipboard.writeText(magicLink.link);
                toast.success("Sign-in link copied");
              }}
            >
              <Copy className="mr-1 h-4 w-4" />
              Copy link
            </Button>
            <Button onClick={() => setMagicLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

