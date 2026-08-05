import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, Users2, Tag } from "lucide-react";
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
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/segments")({
  head: () => ({ meta: [{ title: "Customer Segments — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: SegmentsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Segments</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

async function fetchSegments() {
  const sm = smSupabase as any;
  const [segs, assigns] = await Promise.all([
    sm.from("customer_segments").select("*").order("name"),
    sm.from("customer_segment_assignments").select("segment_id, customer_id"),
  ]);
  if (segs.error) throw segs.error;
  const counts = new Map<string, number>();
  for (const a of assigns.data ?? []) counts.set(a.segment_id, (counts.get(a.segment_id) ?? 0) + 1);
  return (segs.data ?? []).map((s: any) => ({ ...s, memberCount: counts.get(s.id) ?? 0 }));
}

async function fetchCustomers() {
  const sm = smSupabase as any;
  const { data, error } = await sm.from("customers").select("id, first_name, last_name, email").order("last_name").limit(500);
  if (error) throw error;
  return data ?? [];
}

async function fetchAssignments(segmentId: string) {
  const sm = smSupabase as any;
  const { data, error } = await sm.from("customer_segment_assignments")
    .select("id, customer_id, is_automatic, created_at, customers(first_name,last_name,email)")
    .eq("segment_id", segmentId);
  if (error) throw error;
  return data ?? [];
}

function SegmentsPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [pickCustomer, setPickCustomer] = useState("");

  const segsQ = useQuery({ queryKey: ["sm", "segments"], queryFn: fetchSegments });
  const custsQ = useQuery({ queryKey: ["sm", "customers-lite"], queryFn: fetchCustomers });
  const membersQ = useQuery({
    queryKey: ["sm", "segment-members", selected],
    queryFn: () => fetchAssignments(selected!),
    enabled: !!selected,
  });

  const createSeg = useMutation({
    mutationFn: async () => {
      const { error } = await (smSupabase as any).from("customer_segments").insert({ name: newName.trim(), description: newDesc.trim() || null, color: newColor });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segment created");
      setCreating(false); setNewName(""); setNewDesc(""); setNewColor(COLORS[0]);
      qc.invalidateQueries({ queryKey: ["sm", "segments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteSeg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("customer_segments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segment deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["sm", "segments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!selected || !pickCustomer) throw new Error("Pick a customer");
      const { error } = await (smSupabase as any).from("customer_segment_assignments")
        .insert({ segment_id: selected, customer_id: pickCustomer, is_automatic: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added"); setAdding(false); setPickCustomer("");
      qc.invalidateQueries({ queryKey: ["sm", "segment-members", selected] });
      qc.invalidateQueries({ queryKey: ["sm", "segments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("customer_segment_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sm", "segment-members", selected] });
      qc.invalidateQueries({ queryKey: ["sm", "segments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const segs = segsQ.data ?? [];
  const sel = segs.find((s: any) => s.id === selected);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> Customer Segments</h1>
            <p className="text-sm text-muted-foreground">Group customers to target campaigns and reminders.</p>
          </div>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Segment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Segment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="VIPs, Fleet, Overdue…" /></div>
                <div><Label>Description</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} /></div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-1">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setNewColor(c)}
                        className={`h-7 w-7 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c }} aria-label={c} />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={() => createSeg.mutate()} disabled={!newName.trim() || createSeg.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Segments</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {segsQ.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : segs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No segments yet.</p>
              ) : segs.map((s: any) => (
                <button key={s.id} onClick={() => setSelected(s.id)}
                  className={`w-full flex items-center justify-between rounded border p-2 text-sm text-left ${selected === s.id ? "bg-muted border-primary" : "hover:bg-muted/50"}`}>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color ?? "#64748b" }} />
                    {s.name}
                  </span>
                  <Badge variant="outline">{s.memberCount}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {sel ? sel.name : "Select a segment"}
                {sel?.description ? <span className="ml-2 text-xs font-normal text-muted-foreground">{sel.description}</span> : null}
              </CardTitle>
              {sel ? (
                <div className="flex gap-2">
                  <Dialog open={adding} onOpenChange={setAdding}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add member</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add customer to {sel.name}</DialogTitle></DialogHeader>
                      <div>
                        <Label>Customer</Label>
                        <Select value={pickCustomer} onValueChange={setPickCustomer}>
                          <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
                          <SelectContent>
                            {(custsQ.data ?? []).map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || c.id.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
                        <Button onClick={() => addMember.mutate()} disabled={!pickCustomer || addMember.isPending}>Add</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${sel.name}?`)) deleteSeg.mutate(sel.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {!sel ? (
                <p className="text-sm text-muted-foreground">Pick a segment to see its members.</p>
              ) : membersQ.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : (membersQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <div className="space-y-1">
                  {(membersQ.data ?? []).map((m: any) => {
                    const c = m.customers;
                    const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email : m.customer_id.slice(0, 8);
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <Link to="/shop/customers/$id" params={{ id: m.customer_id }} className="flex items-center gap-2 hover:underline">
                          <Users2 className="h-4 w-4 text-muted-foreground" /> {name}
                          {m.is_automatic ? <Badge variant="secondary" className="text-[10px]">auto</Badge> : null}
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
