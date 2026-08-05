import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/leave")({
  head: () => ({ meta: [{ title: "Leave Balances — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: LeavePage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Leave Balances</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found.</div></SiteLayout>,
});

function LeavePage() {
  useShopRealtime(["employee_leave_balances", "leave_types"]);
  const qc = useQueryClient();
  const [openType, setOpenType] = useState(false);
  const [openBal, setOpenBal] = useState(false);
  const [ltype, setLtype] = useState<any>({ name: "", is_paid: true, default_hours_per_year: 80, color: "#3b82f6", is_active: true });
  const [bal, setBal] = useState<any>({ employee_id: "", leave_type_id: "", balance_hours: 0, used_hours: 0, accrued_ytd: 0, year: new Date().getFullYear() });

  const types = useQuery({
    queryKey: ["shop-manager", "leave_types"],
    queryFn: async () => { const { data, error } = await (smSupabase as any).from("leave_types").select("*").order("name"); if (error) throw error; return data ?? []; },
  });
  const balances = useQuery({
    queryKey: ["shop-manager", "employee_leave_balances"],
    queryFn: async () => { const { data, error } = await (smSupabase as any).from("employee_leave_balances").select("*").order("year", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const staff = useQuery({
    queryKey: ["shop-manager", "technicians", "for-leave"],
    queryFn: async () => { const { data } = await (smSupabase as any).from("technicians").select("id, first_name, last_name").limit(500); return data ?? []; },
  });

  const typeMap = useMemo(() => new Map((types.data ?? []).map((t: any) => [t.id, t])), [types.data]);
  const staffMap = useMemo(() => new Map((staff.data ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.id.slice(0, 8)])), [staff.data]);

  const createType = useMutation({
    mutationFn: async () => { if (!ltype.name.trim()) throw new Error("Name required"); const { error } = await (smSupabase as any).from("leave_types").insert(ltype); if (error) throw error; },
    onSuccess: () => { toast.success("Leave type added"); setOpenType(false); qc.invalidateQueries({ queryKey: ["shop-manager", "leave_types"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const createBal = useMutation({
    mutationFn: async () => {
      if (!bal.employee_id || !bal.leave_type_id) throw new Error("Employee & type required");
      const { error } = await (smSupabase as any).from("employee_leave_balances").insert(bal);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Balance saved"); setOpenBal(false); qc.invalidateQueries({ queryKey: ["shop-manager", "employee_leave_balances"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const adjust = useMutation({
    mutationFn: async ({ id, field, delta }: { id: string; field: string; delta: number }) => {
      const row = (balances.data ?? []).find((b: any) => b.id === id);
      if (!row) return;
      const next = Number(row[field] ?? 0) + delta;
      const { error } = await (smSupabase as any).from("employee_leave_balances").update({ [field]: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "employee_leave_balances"] }),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Leave Balances</h1>
              <p className="text-muted-foreground">Track paid time off, sick leave, and other balances per staff.</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="balances">
          <TabsList><TabsTrigger value="balances">Balances</TabsTrigger><TabsTrigger value="types">Leave Types</TabsTrigger></TabsList>

          <TabsContent value="balances" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Dialog open={openBal} onOpenChange={setOpenBal}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Balance</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Leave Balance</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Employee</Label>
                      <Select value={bal.employee_id} onValueChange={(v) => setBal({ ...bal, employee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{(staff.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Leave type</Label>
                      <Select value={bal.leave_type_id} onValueChange={(v) => setBal({ ...bal, leave_type_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{(types.data ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Balance hours</Label><Input type="number" value={bal.balance_hours} onChange={(e) => setBal({ ...bal, balance_hours: Number(e.target.value) })} /></div>
                      <div><Label>Accrued YTD</Label><Input type="number" value={bal.accrued_ytd} onChange={(e) => setBal({ ...bal, accrued_ytd: Number(e.target.value) })} /></div>
                      <div><Label>Used hours</Label><Input type="number" value={bal.used_hours} onChange={(e) => setBal({ ...bal, used_hours: Number(e.target.value) })} /></div>
                      <div><Label>Year</Label><Input type="number" value={bal.year} onChange={(e) => setBal({ ...bal, year: Number(e.target.value) })} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={() => createBal.mutate()} disabled={createBal.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {balances.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (balances.data ?? []).length === 0 ? (
              <Card><CardContent className="pt-6 text-sm text-muted-foreground">No balances yet.</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {(balances.data ?? []).map((b: any) => {
                  const t: any = typeMap.get(b.leave_type_id);
                  return (
                    <Card key={b.id}>
                      <CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-medium">{staffMap.get(b.employee_id) as any ?? "—"}</div>
                          <div className="text-xs text-muted-foreground flex gap-2 items-center">
                            {t && <Badge variant="outline" style={{ borderColor: t.color, color: t.color }}>{t.name}</Badge>}
                            <span>Year {b.year}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Balance</div>
                            <div className="font-bold">{Number(b.balance_hours ?? 0).toFixed(1)}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Used</div>
                            <div className="font-bold">{Number(b.used_hours ?? 0).toFixed(1)}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Accrued</div>
                            <div className="font-bold">{Number(b.accrued_ytd ?? 0).toFixed(1)}h</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => adjust.mutate({ id: b.id, field: "balance_hours", delta: 8 })}>+8h</Button>
                            <Button size="sm" variant="outline" onClick={() => adjust.mutate({ id: b.id, field: "used_hours", delta: 8 })}>Use 8h</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="types" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Dialog open={openType} onOpenChange={setOpenType}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Type</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Leave Type</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={ltype.name} onChange={(e) => setLtype({ ...ltype, name: e.target.value })} placeholder="Paid Time Off" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Default hours/year</Label><Input type="number" value={ltype.default_hours_per_year} onChange={(e) => setLtype({ ...ltype, default_hours_per_year: Number(e.target.value) })} /></div>
                      <div><Label>Color</Label><Input type="color" value={ltype.color} onChange={(e) => setLtype({ ...ltype, color: e.target.value })} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={ltype.is_paid} onCheckedChange={(v) => setLtype({ ...ltype, is_paid: v })} /> Paid</label>
                  </div>
                  <DialogFooter><Button onClick={() => createType.mutate()} disabled={createType.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-2">
              {(types.data ?? []).map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color ?? "#888" }} />
                      <div className="font-medium">{t.name}</div>
                      <Badge variant={t.is_paid ? "default" : "secondary"}>{t.is_paid ? "Paid" : "Unpaid"}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{t.default_hours_per_year}h/year</div>
                  </CardContent>
                </Card>
              ))}
              {(types.data ?? []).length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No leave types yet.</CardContent></Card>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
