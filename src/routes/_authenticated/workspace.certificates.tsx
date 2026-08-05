import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Award as AwardIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/certificates")({
  head: () => ({ meta: [{ title: "Staff Certificates — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: CertificatesPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found.</div></SiteLayout>,
});

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const diff = Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000);
  return diff;
}

function CertificatesPage() {
  useShopRealtime(["staff_certificates", "staff_certificate_types"]);
  const qc = useQueryClient();
  const [openCert, setOpenCert] = useState(false);
  const [openType, setOpenType] = useState(false);
  const [cert, setCert] = useState<any>({ staff_id: "", certificate_type_id: "", certificate_number: "", issue_date: "", expiry_date: "", issuing_authority: "", notes: "" });
  const [ctype, setCtype] = useState<any>({ name: "", description: "", requires_renewal: true, default_validity_months: 24 });

  const types = useQuery({
    queryKey: ["shop-manager", "staff_certificate_types"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any).from("staff_certificate_types").select("*").order("name");
      if (error) throw error; return data ?? [];
    },
  });

  const certs = useQuery({
    queryKey: ["shop-manager", "staff_certificates"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any).from("staff_certificates").select("*").order("expiry_date", { ascending: true, nullsFirst: false });
      if (error) throw error; return data ?? [];
    },
  });

  const staffQ = useQuery({
    queryKey: ["shop-manager", "technicians", "for-certs"],
    queryFn: async () => {
      const { data } = await (smSupabase as any).from("technicians").select("id, first_name, last_name").limit(500);
      return data ?? [];
    },
  });

  const typeMap = useMemo(() => new Map((types.data ?? []).map((t: any) => [t.id, t])), [types.data]);
  const staffMap = useMemo(() => new Map((staffQ.data ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.id.slice(0, 8)])), [staffQ.data]);

  const expiringSoon = (certs.data ?? []).filter((c: any) => { const d = daysUntil(c.expiry_date); return d !== null && d <= 30 && d >= 0; }).length;
  const expired = (certs.data ?? []).filter((c: any) => { const d = daysUntil(c.expiry_date); return d !== null && d < 0; }).length;

  const createCert = useMutation({
    mutationFn: async () => {
      if (!cert.certificate_type_id) throw new Error("Type required");
      const payload = { ...cert, issue_date: cert.issue_date || null, expiry_date: cert.expiry_date || null, staff_id: cert.staff_id || null, status: "active" };
      const { error } = await (smSupabase as any).from("staff_certificates").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Certificate added"); setOpenCert(false); setCert({ staff_id: "", certificate_type_id: "", certificate_number: "", issue_date: "", expiry_date: "", issuing_authority: "", notes: "" }); qc.invalidateQueries({ queryKey: ["shop-manager", "staff_certificates"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const createType = useMutation({
    mutationFn: async () => {
      if (!ctype.name.trim()) throw new Error("Name required");
      const { error } = await (smSupabase as any).from("staff_certificate_types").insert(ctype);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Type added"); setOpenType(false); setCtype({ name: "", description: "", requires_renewal: true, default_validity_months: 24 }); qc.invalidateQueries({ queryKey: ["shop-manager", "staff_certificate_types"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const removeCert = useMutation({
    mutationFn: async (id: string) => { const { error } = await (smSupabase as any).from("staff_certificates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "staff_certificates"] }),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AwardIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Staff Certificates</h1>
              <p className="text-muted-foreground">Track ASE, safety, and specialty certifications with expiries.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={openType} onOpenChange={setOpenType}>
              <DialogTrigger asChild><Button variant="outline">Manage Types</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Certificate Type</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={ctype.name} onChange={(e) => setCtype({ ...ctype, name: e.target.value })} placeholder="ASE Master Tech" /></div>
                  <div><Label>Description</Label><Textarea rows={2} value={ctype.description} onChange={(e) => setCtype({ ...ctype, description: e.target.value })} /></div>
                  <div><Label>Default validity (months)</Label><Input type="number" value={ctype.default_validity_months} onChange={(e) => setCtype({ ...ctype, default_validity_months: Number(e.target.value) })} /></div>
                  {(types.data ?? []).length > 0 && (
                    <div className="pt-3 border-t">
                      <Label className="mb-2 block text-xs">Existing types</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(types.data ?? []).map((t: any) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter><Button onClick={() => createType.mutate()} disabled={createType.isPending}>Save Type</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openCert} onOpenChange={setOpenCert}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Certificate</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Certificate</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Staff member</Label>
                    <Select value={cert.staff_id} onValueChange={(v) => setCert({ ...cert, staff_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>{(staffQ.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={cert.certificate_type_id} onValueChange={(v) => setCert({ ...cert, certificate_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{(types.data ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Certificate #</Label><Input value={cert.certificate_number} onChange={(e) => setCert({ ...cert, certificate_number: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Issue date</Label><Input type="date" value={cert.issue_date} onChange={(e) => setCert({ ...cert, issue_date: e.target.value })} /></div>
                    <div><Label>Expiry date</Label><Input type="date" value={cert.expiry_date} onChange={(e) => setCert({ ...cert, expiry_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Issuing authority</Label><Input value={cert.issuing_authority} onChange={(e) => setCert({ ...cert, issuing_authority: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea rows={2} value={cert.notes} onChange={(e) => setCert({ ...cert, notes: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={() => createCert.mutate()} disabled={createCert.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total certificates</div><div className="text-2xl font-bold">{(certs.data ?? []).length}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Expiring ≤30 days</div><div className="text-2xl font-bold text-amber-600">{expiringSoon}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Expired</div><div className="text-2xl font-bold text-destructive">{expired}</div></CardContent></Card>
        </div>

        {certs.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (certs.data ?? []).length === 0 ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">No certificates yet.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {(certs.data ?? []).map((c: any) => {
              const d = daysUntil(c.expiry_date);
              const status = d === null ? null : d < 0 ? "expired" : d <= 30 ? "expiring" : "valid";
              return (
                <Card key={c.id}>
                  <CardContent className="pt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{(typeMap.get(c.certificate_type_id) as any)?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{c.staff_id ? staffMap.get(c.staff_id) as any : "Unassigned"}</span>
                        {c.certificate_number && <span>#{c.certificate_number}</span>}
                        {c.issuing_authority && <span>· {c.issuing_authority}</span>}
                        {c.expiry_date && <span>· Expires {new Date(c.expiry_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "expired" && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Expired</Badge>}
                      {status === "expiring" && <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/50">Expiring · {d}d</Badge>}
                      {status === "valid" && <Badge variant="outline">{d}d left</Badge>}
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete certificate?")) removeCert.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
