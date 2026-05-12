import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, QrCode, Tag, Plus, Trash2, Users, MousePointerClick, UserPlus, Percent } from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferrals,
});

type StaffRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  referral_code: string;
  qr_storage_path: string | null;
  active: boolean;
  notes: string | null;
};

type Promo = {
  id: string;
  staff_referral_id: string;
  title: string;
  description: string | null;
  kind: string;
  percent_off: number | null;
  flat_amount_php: number | null;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  terms: string | null;
};

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "staff";
  return `${base}${String(Math.floor(Math.random() * 900) + 100)}`;
}

const PUBLIC_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com";

const sb = supabase as any;

function AdminReferrals() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [stats, setStats] = useState<Record<string, { scans: number; signups: number; visitors: number }>>({});
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [promosFor, setPromosFor] = useState<StaffRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("staff_referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as StaffRow[]) || []);

    // aggregate stats
    const { data: scans } = await sb.from("qr_scans").select("referral_code,visitor_id");
    const { data: signups } = await sb.from("user_referrals").select("referred_by_staff_id");
    const s: Record<string, { scans: number; signups: number; visitors: number }> = {};
    (data as StaffRow[] | null)?.forEach((r) => (s[r.id] = { scans: 0, signups: 0, visitors: 0 }));
    const visitorSet: Record<string, Set<string>> = {};
    (scans as any[] | null)?.forEach((x) => {
      const row = (data as StaffRow[] | null)?.find((r) => r.referral_code === x.referral_code);
      if (!row) return;
      s[row.id].scans++;
      visitorSet[row.id] ||= new Set();
      if (x.visitor_id) visitorSet[row.id].add(x.visitor_id);
    });
    Object.keys(visitorSet).forEach((k) => (s[k].visitors = visitorSet[k].size));
    (signups as any[] | null)?.forEach((x) => {
      if (x.referred_by_staff_id && s[x.referred_by_staff_id]) s[x.referred_by_staff_id].signups++;
    });
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generateQrFor = async (row: StaffRow) => {
    const url = `${PUBLIC_BASE}/r/${row.referral_code}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${row.referral_code}.png`;
    const { error: upErr } = await supabase.storage
      .from("qr-codes")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (upErr) {
      toast.error("Could not upload QR: " + upErr.message);
      return null;
    }
    await sb.from("staff_referrals").update({ qr_storage_path: path }).eq("id", row.id);
    return path;
  };

  const publicQrUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("qr-codes").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async (input: {
    full_name: string;
    email: string;
    phone: string;
    referral_code: string;
  }) => {
    const { data, error } = await sb
      .from("staff_referrals")
      .insert({
        full_name: input.full_name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || null,
        referral_code: input.referral_code.toLowerCase().trim(),
        active: true,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await generateQrFor(data as StaffRow);
    toast.success("Staff QR created");
    setNewOpen(false);
    load();
  };

  const handleUpdate = async (row: StaffRow) => {
    const { error } = await sb
      .from("staff_referrals")
      .update({
        full_name: row.full_name,
        email: row.email.toLowerCase().trim(),
        phone: row.phone,
        referral_code: row.referral_code.toLowerCase().trim(),
        active: row.active,
        notes: row.notes,
      })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await generateQrFor(row);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (row: StaffRow) => {
    if (!confirm(`Delete ${row.full_name}'s referral?`)) return;
    const { error } = await sb.from("staff_referrals").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff QR Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Personal referral codes, QR posters, and offers per staff member.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New staff QR
        </Button>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Scans</th>
              <th className="px-4 py-2">Visitors</th>
              <th className="px-4 py-2">Signups</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No staff referrals yet.</td></tr>
            ) : (
              rows.map((r) => {
                const s = stats[r.id] || { scans: 0, signups: 0, visitors: 0 };
                const qr = publicQrUrl(r.qr_storage_path);
                const link = `${PUBLIC_BASE}/r/${r.referral_code}`;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.referral_code}</td>
                    <td className="px-4 py-3">{s.scans}</td>
                    <td className="px-4 py-3">{s.visitors}</td>
                    <td className="px-4 py-3">{s.signups}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${r.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Copy link"
                          onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {qr && (
                          <a href={qr} download={`${r.referral_code}.png`} title="Download QR">
                            <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" title="Promotions" onClick={() => setPromosFor(r)}>
                          <Tag className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {newOpen && <StaffDialog onClose={() => setNewOpen(false)} onSubmit={handleCreate} />}
      {editing && (
        <StaffDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => handleUpdate({ ...editing, ...v })}
        />
      )}
      {promosFor && <PromoDialog staff={promosFor} onClose={() => setPromosFor(null)} />}
    </div>
  );
}

function StaffDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: StaffRow;
  onClose: () => void;
  onSubmit: (v: { full_name: string; email: string; phone: string; referral_code: string; active?: boolean; notes?: string }) => void;
}) {
  const [full_name, setFullName] = useState(initial?.full_name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [referral_code, setReferralCode] = useState(initial?.referral_code || "");
  const [active, setActive] = useState(initial?.active ?? true);

  useEffect(() => {
    if (!initial && full_name && !referral_code) setReferralCode(slugify(full_name));
  }, [full_name, initial, referral_code]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit staff QR" : "New staff QR"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Company email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Referral code</Label>
            <Input value={referral_code} onChange={(e) => setReferralCode(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">URL: {PUBLIC_BASE}/r/{referral_code || "code"}</p>
          </div>
          {initial && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><div className="text-sm font-medium">Active</div><p className="text-xs text-muted-foreground">Inactive codes still log scans but don’t credit signups.</p></div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit({ full_name, email, phone, referral_code, active })}
            disabled={!full_name || !email || !referral_code}
          >
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoDialog({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Promo>>({
    title: "", description: "", kind: "promo", applies_to: "any", active: true,
  });

  const load = async () => {
    const { data } = await sb.from("staff_promotions").select("*")
      .eq("staff_referral_id", staff.id).order("created_at", { ascending: false });
    setPromos((data as Promo[]) || []);
  };
  useEffect(() => { load(); }, [staff.id]);

  const submit = async () => {
    const { error } = await sb.from("staff_promotions").insert({
      staff_referral_id: staff.id,
      title: form.title,
      description: form.description || null,
      kind: form.kind,
      percent_off: form.percent_off || null,
      flat_amount_php: form.flat_amount_php || null,
      applies_to: form.applies_to || "any",
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      terms: form.terms || null,
      active: true,
    });
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setForm({ title: "", description: "", kind: "promo", applies_to: "any", active: true });
    load();
  };

  const toggle = async (p: Promo) => {
    await sb.from("staff_promotions").update({ active: !p.active }).eq("id", p.id);
    load();
  };
  const del = async (p: Promo) => {
    if (!confirm("Delete this promotion?")) return;
    await sb.from("staff_promotions").delete().eq("id", p.id);
    load();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Promotions for {staff.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {promos.length === 0 && !creating && <p className="text-sm text-muted-foreground">No offers attached yet.</p>}
          {promos.map((p) => (
            <div key={p.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.title} <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs">{p.kind}</span></div>
                  <p className="text-xs text-muted-foreground">
                    {p.percent_off ? `${p.percent_off}% off · ` : ""}{p.flat_amount_php ? `₱${p.flat_amount_php} · ` : ""}applies to {p.applies_to}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.active ? "Pause" : "Resume"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}

          {creating ? (
            <div className="rounded-md border p-3 space-y-3">
              <div><Label>Title</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kind</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promo">Promo</SelectItem>
                      <SelectItem value="deal">Deal</SelectItem>
                      <SelectItem value="rate">Rate</SelectItem>
                      <SelectItem value="incentive">Incentive</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Applies to</Label>
                  <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="listing_fee">Listing fee</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="tow">Tow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>% off</Label><Input type="number" value={form.percent_off ?? ""} onChange={(e) => setForm({ ...form, percent_off: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Flat ₱</Label><Input type="number" value={form.flat_amount_php ?? ""} onChange={(e) => setForm({ ...form, flat_amount_php: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Starts</Label><Input type="date" value={form.starts_at?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })} /></div>
                <div><Label>Ends</Label><Input type="date" value={form.ends_at?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })} /></div>
              </div>
              <div><Label>Terms</Label><Textarea value={form.terms || ""} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={submit} disabled={!form.title}>Add</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Add promotion</Button>
          )}
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
