import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_NAV, type AdminNavRole, type AdminNavItem } from "@/lib/admin-nav";
import {
  getUserPermissionDossier,
  type UserPermissionDossier,
} from "@/lib/admin-diagnostics.functions";

export const Route = createFileRoute("/admin/diagnostics")({
  component: DiagnosticsPage,
  head: () => ({
    meta: [
      { title: "Permission diagnostics — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function canAccess(roles: AdminNavRole[], itemRoles: AdminNavRole[]) {
  return itemRoles.some((r) => roles.includes(r));
}

function mapToNavRoles(roles: string[]): AdminNavRole[] {
  const out: AdminNavRole[] = [];
  if (roles.includes("admin")) out.push("admin");
  if (
    roles.includes("sales") ||
    roles.includes("sales_junior") ||
    roles.includes("sales_senior") ||
    roles.includes("sales_manager")
  ) {
    out.push("sales");
  }
  if (roles.includes("moderator")) out.push("moderator");
  if (roles.includes("support")) out.push("support");
  if (roles.includes("advertising")) out.push("advertising");
  return out;
}

function RolePill({ role, tone = "default" }: { role: string; tone?: "default" | "muted" | "warn" }) {
  const cls =
    tone === "warn"
      ? "border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-200"
      : tone === "muted"
        ? "border-border bg-muted text-muted-foreground"
        : "border-primary/40 bg-primary/10 text-primary";
  return (
    <Badge variant="outline" className={cls}>
      {role}
    </Badge>
  );
}

function NavMatrix({
  title,
  description,
  roles,
}: {
  title: string;
  description: string;
  roles: AdminNavRole[];
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, AdminNavItem[]>();
    for (const item of ADMIN_NAV) {
      const k = item.section ?? "Overview";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(item);
    }
    return Array.from(groups.entries());
  }, []);

  const allowedCount = ADMIN_NAV.filter((i) => canAccess(roles, i.roles)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {description} — {allowedCount} / {ADMIN_NAV.length} sections accessible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map(([section, items]) => (
          <div key={section}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Section</TableHead>
                  <TableHead>Required roles</TableHead>
                  <TableHead className="w-[120px] text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const ok = canAccess(roles, item.roles);
                  return (
                    <TableRow key={item.to}>
                      <TableCell>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.to}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.roles.map((r) => (
                            <RolePill key={r} role={r} tone={roles.includes(r) ? "default" : "muted"} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <Check className="h-3 w-3" /> Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            <X className="h-3 w-3" /> Blocked
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Boolean({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          on
            ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            : "rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground"
        }
      >
        {on ? "ON" : "off"}
      </span>
    </div>
  );
}

function DiagnosticsPage() {
  const {
    user,
    isAdmin,
    isSales,
    isModerator,
    isSupport,
    isAdvertising,
    isStaff,
    salesTier,
    canManageAds,
    canCreatePromotions,
    canIssueDiscounts,
    realRoles,
    effectiveRoles,
    simulatedRoles,
    realIsAdmin,
    realSellerType,
    effectiveSellerType,
  } = useAuth();

  const myNavRoles = useMemo(() => mapToNavRoles(effectiveRoles as string[]), [effectiveRoles]);

  // Look-up state
  const [email, setEmail] = useState("");
  const lookupFn = useServerFn(getUserPermissionDossier);
  const lookup = useMutation({
    mutationFn: (e: string) => lookupFn({ data: { email: e } }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Look-up failed.";
      toast.error(msg);
    },
  });
  const dossier: UserPermissionDossier | undefined = lookup.data;
  const lookupRoles =
    dossier && !dossier.not_found ? mapToNavRoles(dossier.roles) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Permission diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Inspect roles, derived flags, and admin-area access for your session or any user.
          </p>
        </div>
      </div>

      {/* MY SESSION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My session</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Real roles
              </Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {realRoles.length === 0 && (
                  <span className="text-xs text-muted-foreground">none</span>
                )}
                {realRoles.map((r) => (
                  <RolePill key={r} role={r} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Effective roles {simulatedRoles ? "(simulated)" : ""}
              </Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {effectiveRoles.length === 0 && (
                  <span className="text-xs text-muted-foreground">none</span>
                )}
                {(effectiveRoles as AppRole[]).map((r) => (
                  <RolePill key={r} role={r} tone={simulatedRoles ? "warn" : "default"} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Boolean label="isAdmin" on={isAdmin} />
            <Boolean label="realIsAdmin" on={realIsAdmin} />
            <Boolean label="isStaff" on={isStaff} />
            <Boolean label="isSales" on={isSales} />
            <Boolean label="isModerator" on={isModerator} />
            <Boolean label="isSupport" on={isSupport} />
            <Boolean label="isAdvertising" on={isAdvertising} />
            <Boolean label="canManageAds" on={canManageAds} />
            <Boolean label="canCreatePromotions" on={canCreatePromotions} />
            <Boolean label="canIssueDiscounts" on={canIssueDiscounts} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Sales tier</div>
              <div className="font-medium">{salesTier ?? "—"}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Real seller type</div>
              <div className="font-medium">{realSellerType}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Effective seller type</div>
              <div className="font-medium">{effectiveSellerType}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MY NAV MATRIX */}
      <NavMatrix
        title="My admin access"
        description="Which admin sections you can open with your effective roles"
        roles={myNavRoles}
      />

      {/* USER LOOK-UP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look up another user</CardTitle>
          <CardDescription>
            Inspect roles and access for any account by email. Admin-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = email.trim();
              if (!v) return;
              lookup.mutate(v);
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={lookup.isPending || !email.trim()}>
              {lookup.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Look up
                </>
              )}
            </Button>
          </form>

          {dossier && dossier.not_found && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              No user found with that email.
            </div>
          )}

          {dossier && !dossier.not_found && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">User</div>
                  <div className="font-medium">{dossier.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{dossier.email}</div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                    {dossier.user_id}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Seller type</div>
                    <div className="font-medium">{dossier.seller_type ?? "—"}</div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Last sign-in</div>
                    <div className="font-medium">
                      {dossier.last_sign_in_at
                        ? new Date(dossier.last_sign_in_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Roles
                </Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dossier.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">no roles</span>
                  ) : (
                    dossier.roles.map((r) => <RolePill key={r} role={r} />)
                  )}
                </div>
              </div>

              <NavMatrix
                title="Their admin access"
                description={`What ${dossier.email ?? "this user"} can open in the admin console`}
                roles={lookupRoles}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
