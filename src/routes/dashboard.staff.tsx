import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Plus, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyOwnedOrg, listStaff, getSeatUsage } from "@/lib/seller-staff.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";

export const Route = createFileRoute("/dashboard/staff")({
  component: StaffPage,
  head: () => ({
    meta: [
      { title: "Staff & Access — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function StaffPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOwnedOrg);
  const fetchStaff = useServerFn(listStaff);
  const fetchSeats = useServerFn(getSeatUsage);

  const { data: org } = useQuery({
    queryKey: ["my-owned-org", user?.id],
    queryFn: () => fetchOrg(),
    enabled: !!user,
  });

  const orgId = (org as any)?.id as string | undefined;

  const { data: members = [] } = useQuery({
    queryKey: ["staff-members", orgId],
    queryFn: () => fetchStaff({ data: { orgId: orgId! } }),
    enabled: !!orgId,
  });

  const { data: seats } = useQuery({
    queryKey: ["staff-seats", orgId],
    queryFn: () => fetchSeats({ data: { orgId: orgId! } }),
    enabled: !!orgId,
  });

  const [addOpen, setAddOpen] = useState(false);

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!org)
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        You don't own a seller account yet. <Link to="/dashboard/profile" className="text-primary underline">Set up your profile</Link> first.
      </Card>
    );

  const used = seats?.used ?? 0;
  const max = seats?.max;
  const atLimit = max != null && used >= max;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Staff & Access
          </h1>
          <p className="text-sm text-muted-foreground">
            Account: <span className="font-semibold">{(org as any).name}</span> · login suffix{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">@{(org as any).slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={atLimit ? "destructive" : "secondary"}>
            {used} of {max ?? "∞"} seats used
          </Badge>
          <Button onClick={() => setAddOpen(true)} disabled={atLimit}>
            <Plus className="mr-1 h-4 w-4" /> Add staff
          </Button>
        </div>
      </div>

      {atLimit && (
        <Card className="p-4 text-sm">
          You've hit your plan's staff limit.{" "}
          <Link to="/dashboard/billing" className="text-primary underline font-medium">
            Upgrade your plan
          </Link>{" "}
          to add more staff users.
        </Card>
      )}

      <Card className="divide-y">
        {members.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No staff yet.</div>
        )}
        {(members as any[]).map((m) => {
          const p = m.profiles ?? {};
          const isOwner = m.role === "owner";
          return (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.login_username ? `login: ${p.login_username}` : isOwner ? "Owner email" : "—"}
                </div>
              </div>
              <Badge variant={isOwner ? "default" : "outline"}>
                {isOwner ? "Owner" : "Staff"}
              </Badge>
              {!isOwner && orgId && (
                <RowActions orgId={orgId} userId={m.user_id} onChange={() => {
                  qc.invalidateQueries({ queryKey: ["staff-members", orgId] });
                  qc.invalidateQueries({ queryKey: ["staff-seats", orgId] });
                }} />
              )}
            </div>
          );
        })}
      </Card>

      {orgId && (
        <AddStaffDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          orgId={orgId}
          orgSlug={(org as any).slug}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["staff-members", orgId] });
            qc.invalidateQueries({ queryKey: ["staff-seats", orgId] });
          }}
        />
      )}
    </div>
  );
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? `Bearer ${data.session.access_token}` : "";
}

function AddStaffDialog({
  open, onOpenChange, orgId, orgSlug, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; orgId: string; orgSlug: string; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (username.trim().length < 2 || password.length < 8 || fullName.trim().length < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await authHeader() },
        body: JSON.stringify({ orgId, username: username.trim(), password, fullName: fullName.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.upgrade_required) toast.error(`Seat limit reached (${json.current_seats}/${json.max_seats}). Upgrade your plan.`);
        else toast.error(json?.error ?? "Failed to add staff");
        return;
      }
      toast.success(`Staff created — they can sign in with "${json.loginUsername}"`);
      setFullName(""); setUsername(""); setPassword("");
      onOpenChange(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff user</DialogTitle>
          <DialogDescription>
            They'll be able to post listings and reply to customer messages under your seller account. No email is sent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Steve Reyes" />
          </div>
          <div>
            <Label>Username</Label>
            <div className="flex items-center gap-1">
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="steve" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">@{orgSlug}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">They will sign in with this username.</p>
          </div>
          <div>
            <Label>Password (min 8)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="pt-2"><FormFeedbackLink formId="staff-create" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || username.trim().length < 2 || password.length < 8}>
            {submitting ? "Creating…" : "Create staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ orgId, userId, onChange }: { orgId: string; userId: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    const pw = window.prompt("New password (min 8 chars)");
    if (!pw || pw.length < 8) return;
    setBusy(true);
    try {
      const res = await fetch("/api/seller/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await authHeader() },
        body: JSON.stringify({ orgId, userId, newPassword: pw }),
      });
      if (!res.ok) { toast.error((await res.json().catch(()=>({})))?.error ?? "Failed"); return; }
      toast.success("Password updated");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Remove this staff user? They will no longer be able to sign in.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/seller/staff/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await authHeader() },
        body: JSON.stringify({ orgId, userId }),
      });
      if (!res.ok) { toast.error((await res.json().catch(()=>({})))?.error ?? "Failed"); return; }
      toast.success("Staff removed");
      onChange();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
        <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
