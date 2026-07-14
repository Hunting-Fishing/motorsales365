import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase, supabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/leave-requests")({
  head: () => ({ meta: [{ title: "Leave Requests — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: LeaveRequestsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found</div></SiteLayout>,
});

type Req = {
  id: string; employee_id: string; leave_type_id: string | null;
  start_date: string; end_date: string; hours: number; reason: string | null;
  status: string; reviewed_by: string | null; reviewed_at: string | null; review_notes: string | null;
  created_at: string;
};

async function fetchAll() {
  const [{ data: reqs }, { data: types }, { data: bals }, { data: userRes }] = await Promise.all([
    (smSupabase as any).from("leave_requests").select("*").order("created_at", { ascending: false }),
    (smSupabase as any).from("leave_types").select("id,name,color").eq("is_active", true),
    (smSupabase as any).from("employee_leave_balances").select("id,employee_id,leave_type_id,used_hours,balance_hours,accrued_hours"),
    supabase.auth.getUser(),
  ]);
  // Determine if current user can approve (manager/admin/owner in shop_manager.profiles or public.user_roles)
  const uid = userRes?.user?.id ?? null;
  let canApprove = false;
  if (uid) {
    const { data: prof } = await (smSupabase as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    const role = String(prof?.role ?? "").toLowerCase();
    if (["owner", "admin", "manager"].includes(role)) canApprove = true;
    if (!canApprove) {
      const { data: pubRole } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (pubRole === true) canApprove = true;
    }
  }
  return {
    reqs: (reqs ?? []) as Req[],
    types: (types ?? []) as { id: string; name: string; color: string | null }[],
    balances: (bals ?? []) as { id: string; employee_id: string; leave_type_id: string; used_hours: number; balance_hours: number; accrued_hours: number }[],
    currentUserId: uid,
    canApprove,
  };
}


function statusBadge(s: string) {
  if (s === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Approved</Badge>;
  if (s === "rejected") return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300">Rejected</Badge>;
  if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Pending</Badge>;
}

function LeaveRequestsPage() {
  useShopRealtime(["leave_requests", "leave_types", "employee_leave_balances"]);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["shop-manager", "leave_requests"], queryFn: fetchAll });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type_id: "", start_date: "", end_date: "", hours: "8", reason: "" });

  const submit = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await (smSupabase as any).from("leave_requests").insert({
        employee_id: u.user.id,
        leave_type_id: form.leave_type_id || null,
        start_date: form.start_date,
        end_date: form.end_date,
        hours: Number(form.hours) || 0,
        reason: form.reason || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leave request submitted");
      setOpen(false);
      setForm({ leave_type_id: "", start_date: "", end_date: "", hours: "8", reason: "" });
      qc.invalidateQueries({ queryKey: ["shop-manager", "leave_requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "approved" | "rejected"; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (smSupabase as any).from("leave_requests").update({
        status, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString(), review_notes: notes ?? null,
      }).eq("id", id);
      if (error) throw error;

      // On approve, add to used_hours in balance
      if (status === "approved") {
        const row = data?.reqs.find(r => r.id === id);
        if (row && row.leave_type_id) {
          const { data: bal } = await (smSupabase as any).from("employee_leave_balances")
            .select("id,used_hours,balance_hours")
            .eq("employee_id", row.employee_id).eq("leave_type_id", row.leave_type_id).maybeSingle();
          if (bal) {
            await (smSupabase as any).from("employee_leave_balances").update({
              used_hours: Number(bal.used_hours || 0) + Number(row.hours),
              balance_hours: Number(bal.balance_hours || 0) - Number(row.hours),
            }).eq("id", bal.id);
          }
        }
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "Approved" : "Rejected");
      qc.invalidateQueries({ queryKey: ["shop-manager", "leave_requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reqs = data?.reqs ?? [];
  const pending = reqs.filter(r => r.status === "pending");
  const decided = reqs.filter(r => r.status !== "pending");

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6" /> Leave Requests</h1>
            <p className="text-sm text-muted-foreground">Submit time-off requests and manage approvals.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Time Off</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={form.leave_type_id} onValueChange={v => setForm(f => ({ ...f, leave_type_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {data?.types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>End</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div><Label>Hours</Label><Input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></div>
                <div><Label>Reason (optional)</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => submit.mutate()} disabled={submit.isPending || !form.start_date || !form.end_date}>
                  {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="history">History ({decided.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-3 pt-4">
              {pending.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No pending requests.</CardContent></Card>}
              {pending.map(r => <RequestRow key={r.id} r={r} types={data?.types ?? []} onReview={(status, notes) => review.mutate({ id: r.id, status, notes })} reviewable />)}
            </TabsContent>
            <TabsContent value="history" className="space-y-3 pt-4">
              {decided.map(r => <RequestRow key={r.id} r={r} types={data?.types ?? []} onReview={() => {}} />)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </SiteLayout>
  );
}

function RequestRow({ r, types, onReview, reviewable }: { r: Req; types: { id: string; name: string; color: string | null }[]; onReview: (status: "approved" | "rejected", notes?: string) => void; reviewable?: boolean }) {
  const [notes, setNotes] = useState("");
  const type = types.find(t => t.id === r.leave_type_id);
  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {type?.name ?? "Leave"} {statusBadge(r.status)}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {r.start_date} → {r.end_date} · {r.hours}h · submitted {new Date(r.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardHeader>
      {(r.reason || r.review_notes || reviewable) && (
        <CardContent className="pt-0 space-y-3">
          {r.reason && <p className="text-sm">{r.reason}</p>}
          {r.review_notes && <p className="text-sm text-muted-foreground italic">Reviewer: {r.review_notes}</p>}
          {reviewable && (
            <div className="flex gap-2 pt-2 border-t">
              <Input placeholder="Review notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => onReview("rejected", notes || undefined)}><X className="h-4 w-4 mr-1" /> Reject</Button>
              <Button size="sm" onClick={() => onReview("approved", notes || undefined)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
