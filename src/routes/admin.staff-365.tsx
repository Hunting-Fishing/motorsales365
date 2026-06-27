import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Power, RefreshCw, ShieldOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { EditProfileDialog } from "@/components/admin/edit-profile-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { listStaff365, setStaff365Disabled } from "@/lib/admin-staff-list.functions";
import { generateStaffMagicLink } from "@/lib/admin-magic-link.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailRoutingPanel } from "@/components/admin/email-routing-panel";
import { StaffQrDialog } from "@/components/admin/staff-qr-dialog";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";
const STAFF_DOMAIN = "@365motorsales.com";

export const Route = createFileRoute("/admin/staff-365")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === "routing" ? ("routing" as const) : ("staff" as const),
  }),
  component: Staff365Page,
});

function Staff365Page() {
  const { user, loading: authLoading } = useAuth();
  const { tab: initialTab } = useSearch({ from: "/admin/staff-365" });
  const isSuperAdmin = (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const fetchStaff = useServerFn(listStaff365);
  const toggleDisabled = useServerFn(setStaff365Disabled);
  const genMagicLink = useServerFn(generateStaffMagicLink);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<{ email: string; link: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await (fetchStaff as any)();
      setRows(res.rows ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [fetchStaff]);

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin, load]);

  if (authLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Only the super-admin can manage 365 staff.{" "}
        {user?.email ? `(signed in as ${user.email})` : "(not signed in)"}
      </div>
    );
  }

  const handleMagicLink = async (id: string) => {
    setBusyId(id);
    try {
      const res = await genMagicLink({ data: { targetUserId: id } });
      setMagicLink({ email: res.email, link: res.actionLink });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleDisabled = async (id: string, disabled: boolean) => {
    setBusyId(id);
    try {
      await toggleDisabled({ data: { targetUserId: id, disabled: !disabled } });
      toast.success(disabled ? "Account enabled" : "Account disabled");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">365 Staff</h1>
        <p className="text-xs text-muted-foreground">
          Manage <strong>{STAFF_DOMAIN}</strong> employees and every email address connected to
          the business.
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="routing">Email Routing</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AddUserDialog
            onCreated={load}
            lockStaff
            enforceDomain={STAFF_DOMAIN}
            triggerLabel="Create Employee"
          />
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      <div className="space-y-2">
        {!loading && rows.length === 0 && !err && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No staff yet. Click "Create Employee" to add one.
          </div>
        )}
        {rows.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                <span>{u.full_name ?? "(no name)"}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
                {u.disabled && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    disabled
                  </span>
                )}
                {!u.last_sign_in_at && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    never signed in
                  </span>
                )}
                {!u.has_route ? (
                  <span
                    className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                    title="No Cloudflare Email Routing rule found — password reset & magic link emails sent to this address will not be delivered. Add a routing rule in the Email Routing tab."
                  >
                    no inbox route
                  </span>
                ) : (
                  <span
                    className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                    title={`Forwards to ${u.route_destination ?? "(unknown)"}`}
                  >
                    → {u.route_destination ?? "routed"}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                joined {u.created_at ? formatDate(u.created_at) : "?"} · last sign-in{" "}
                {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "never"}
              </div>
              {!u.has_route && (
                <div className="mt-1 text-xs text-destructive">
                  Reset/magic-link emails won't reach this user. Either add a Cloudflare routing
                  rule in the Email Routing tab, or use "Sign-in link" / "Reset password" here and
                  send the link to them directly.
                </div>
              )}
              {u.roles.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {u.roles.map((r: string) => (
                    <span
                      key={r}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === u.id}
                onClick={() => handleMagicLink(u.id)}
                title="One-time sign-in link"
              >
                <Eye className="mr-1 h-4 w-4" />
                Sign-in link
              </Button>
              {u.referral_code && (
                <StaffQrDialog
                  code={u.referral_code}
                  name={u.full_name}
                  email={u.email}
                  active={Boolean(u.referral_active)}
                />
              )}
              <EditProfileDialog user={u} onSaved={load} canEditRoles={isSuperAdmin} />
              <ResetPasswordDialog user={u} />
              <Button
                size="sm"
                variant={u.disabled ? "outline" : "destructive"}
                disabled={busyId === u.id}
                onClick={() => handleToggleDisabled(u.id, u.disabled)}
              >
                {u.disabled ? (
                  <>
                    <Power className="mr-1 h-4 w-4" />
                    Enable
                  </>
                ) : (
                  <>
                    <ShieldOff className="mr-1 h-4 w-4" />
                    Disable
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
        </TabsContent>

        <TabsContent value="routing" className="mt-4">
          <EmailRoutingPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={!!magicLink} onOpenChange={(o) => !o && setMagicLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One-time sign-in link</DialogTitle>
            <DialogDescription>
              Send this link to <strong>{magicLink?.email}</strong>. Opening it signs them in
              without a password. Single-use, expires shortly.
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
