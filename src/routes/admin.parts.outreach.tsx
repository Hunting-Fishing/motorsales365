import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone, Mail, MapPin, ExternalLink, Star, Globe2, Plus, Save, Trash2, X,
  PhoneCall, MessageSquare, Calendar, ChevronRight, Flag, ListChecks,
} from "lucide-react";
import {
  listOutreachBoard,
  getSupplierDetail,
  updateSupplierOps,
  upsertSupplierContact,
  deleteSupplierContact,
  logOutreach,
  upsertSupplierTask,
  deleteSupplierTask,
  PIPELINE_STAGES,
  OUTCOMES,
  CHANNELS,
} from "@/lib/parts-ops.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/parts/outreach")({
  component: OutreachWorkspace,
  head: () => ({ meta: [{ title: "Parts Supplier Outreach — Admin" }] }),
});

type Row = any;

const STAGE_COLOR: Record<string, string> = {
  lead: "bg-muted text-foreground",
  researched: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  contacted: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  qualified: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pitched: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  negotiating: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  onboarding: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  lost: "bg-destructive/15 text-destructive",
};

function OutreachWorkspace() {
  const list = useServerFn(listOutreachBoard);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "pipeline" | "all">("today");
  const [region, setRegion] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try { setRows(await list()); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return rows.filter(r =>
      (region === "all" || r.region === region) &&
      !r.do_not_contact &&
      (!term || r.name.toLowerCase().includes(term) ||
        (r.brands ?? []).join(" ").toLowerCase().includes(term))
    );
  }, [rows, region, q]);

  const today = useMemo(() => {
    const now = Date.now();
    return filtered
      .filter(r => {
        if (r.pipeline_stage === "live" || r.pipeline_stage === "lost") return false;
        if (r.next_action_at && new Date(r.next_action_at).getTime() <= now + 1000 * 60 * 60 * 24) return true;
        if (!r.last_contacted_at) return true; // never contacted
        return false;
      })
      .slice(0, 200);
  }, [filtered]);

  const stats = useMemo(() => ({
    leads: rows.filter(r => r.pipeline_stage === "lead").length,
    inProgress: rows.filter(r => !["lead", "live", "lost"].includes(r.pipeline_stage)).length,
    live: rows.filter(r => r.pipeline_stage === "live").length,
    overdue: rows.filter(r => r.next_action_at && new Date(r.next_action_at).getTime() < Date.now()).length,
  }), [rows]);

  const regions = useMemo(() => Array.from(new Set(rows.map(r => r.region))).sort(), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Parts Supplier Outreach</h1>
          <p className="text-sm text-muted-foreground">
            Call, email, and onboard parts suppliers from lead to live partner.
          </p>
        </div>
        <a
          href="/admin/parts"
          className="text-sm text-primary hover:underline"
        >
          ← Back to Parts admin
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Cold leads" value={stats.leads} />
        <Stat label="In progress" value={stats.inProgress} accent="primary" />
        <Stat label="Live partners" value={stats.live} accent="emerald" />
        <Stat label="Overdue follow-ups" value={stats.overdue} accent="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")}>
          <PhoneCall className="h-4 w-4" /> Today ({today.length})
        </TabBtn>
        <TabBtn active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
          <ChevronRight className="h-4 w-4" /> Pipeline
        </TabBtn>
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          <ListChecks className="h-4 w-4" /> All suppliers
        </TabBtn>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-48 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tab === "pipeline" ? (
        <PipelineBoard rows={filtered} onOpen={setOpenId} />
      ) : (
        <CallQueueTable rows={tab === "today" ? today : filtered} onOpen={setOpenId} />
      )}

      {openId && (
        <SupplierDrawer
          supplierId={openId}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "primary" | "emerald" | "amber" }) {
  const color =
    accent === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : accent === "amber" ? "text-amber-600 dark:text-amber-400"
    : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STAGE_COLOR[stage] ?? "bg-secondary"}`}>
      {stage}
    </span>
  );
}

function CallQueueTable({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  if (rows.length === 0)
    return <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nothing here. Nice work — or move some leads into Researched to start.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase">
          <tr>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Next action</th>
            <th className="px-3 py-2">Last contacted</th>
            <th className="px-3 py-2">Quick</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const phone = r.contact_phone as string | null;
            const email = r.account_email as string | null;
            return (
              <tr key={r.id} className="border-t border-border align-top hover:bg-secondary/30">
                <td className="px-3 py-2">
                  <button onClick={() => onOpen(r.id)} className="flex items-center gap-1 text-left font-medium hover:text-primary">
                    {r.is_recommended && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                    {r.name}
                  </button>
                  <div className="text-[11px] text-muted-foreground">
                    {r.region}{r.city ? ` · ${r.city}` : ""} · {(r.brands ?? []).slice(0, 3).join(", ") || "—"}
                  </div>
                </td>
                <td className="px-3 py-2"><StageBadge stage={r.pipeline_stage} /></td>
                <td className="px-3 py-2 text-xs">{r.lead_score ?? 0}</td>
                <td className="px-3 py-2 text-xs">
                  {r.next_action_at ? new Date(r.next_action_at).toLocaleString() : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.last_contacted_at ? new Date(r.last_contacted_at).toLocaleDateString() : <span className="text-amber-600">never</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {phone && <IconLink href={`tel:${phone}`} title={phone}><Phone className="h-3.5 w-3.5" /></IconLink>}
                    {email && <IconLink href={`mailto:${email}`} title={email}><Mail className="h-3.5 w-3.5" /></IconLink>}
                    {r.website && <IconLink href={r.website} title="Website" newTab><Globe2 className="h-3.5 w-3.5" /></IconLink>}
                    {r.google_maps_url && <IconLink href={r.google_maps_url} title="Map" newTab><MapPin className="h-3.5 w-3.5" /></IconLink>}
                    <Button size="sm" variant="ghost" onClick={() => onOpen(r.id)}>Log…</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineBoard({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  const cols = PIPELINE_STAGES.map(stage => ({
    stage,
    items: rows.filter(r => r.pipeline_stage === stage),
  }));
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cols.map(col => (
        <div key={col.stage} className="min-w-[240px] flex-1 rounded-lg border border-border bg-card p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <StageBadge stage={col.stage} />
            <span className="text-xs text-muted-foreground">{col.items.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {col.items.map(r => (
              <button
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="rounded-md border border-border bg-background p-2 text-left text-xs hover:border-primary"
              >
                <div className="flex items-center gap-1 font-medium">
                  {r.is_recommended && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                  {r.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {r.region} · score {r.lead_score ?? 0}
                </div>
                {r.next_action_at && (
                  <div className="mt-1 text-[10px] text-amber-600">
                    ⏰ {new Date(r.next_action_at).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))}
            {col.items.length === 0 && <div className="px-1 py-2 text-[11px] text-muted-foreground">—</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconLink({ href, title, newTab, children }: { href: string; title: string; newTab?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer noopener" : undefined}
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border hover:border-primary hover:text-primary"
    >
      {children}
    </a>
  );
}

// ============ Drawer ============

function SupplierDrawer({ supplierId, onClose, onChanged }: { supplierId: string; onClose: () => void; onChanged: () => void }) {
  const get = useServerFn(getSupplierDetail);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setData(await get({ data: { supplier_id: supplierId } })); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [supplierId]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold">
              {loading ? "Loading…" : data?.supplier?.name}
            </h2>
            {data?.supplier && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StageBadge stage={data.supplier.pipeline_stage} />
                <span>{data.supplier.region}</span>
                {data.supplier.city && <span>· {data.supplier.city}</span>}
                <span>· score {data.supplier.lead_score ?? 0}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {loading || !data ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex-1 space-y-4 p-4">
            <CallSheet supplier={data.supplier} />
            <LogCallForm supplier={data.supplier} contacts={data.contacts} onLogged={() => { refresh(); onChanged(); }} />
            <OpsPanel supplier={data.supplier} onSaved={() => { refresh(); onChanged(); }} />
            <ContactsPanel supplierId={supplierId} contacts={data.contacts} onChanged={refresh} />
            <TasksPanel supplierId={supplierId} tasks={data.tasks} onChanged={refresh} />
            <TimelinePanel outreach={data.outreach} contacts={data.contacts} />
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function CallSheet({ supplier }: { supplier: any }) {
  const phone = supplier.contact_phone;
  const email = supplier.account_email;
  return (
    <Panel title="Call sheet" icon={<Phone className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Phone: </span>{phone ? <a className="text-primary hover:underline" href={`tel:${phone}`}>{phone}</a> : "—"}</div>
        <div><span className="text-muted-foreground">Email: </span>{email ? <a className="text-primary hover:underline" href={`mailto:${email}`}>{email}</a> : "—"}</div>
        <div><span className="text-muted-foreground">Hours: </span>{supplier.business_hours ?? "—"}</div>
        <div><span className="text-muted-foreground">Brands: </span>{(supplier.brands ?? []).slice(0, 6).join(", ") || "—"}</div>
      </div>
      <details className="mt-2 rounded border border-border bg-card p-2 text-xs">
        <summary className="cursor-pointer font-medium">PH pitch script + discovery questions</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p><strong>Opening:</strong> "Hi, I'm calling from 365 Motor Sales — the Philippines' growing marketplace for cars, parts, and services. We're connecting buyers directly with trusted parts suppliers and I'd like to see if there's a fit."</p>
          <p><strong>Ask:</strong> brands carried · OEM vs aftermarket · min order · do you ship nationwide · do you have a product feed or API · payment terms · BIR/permit ready · current online channels (Lazada/Shopee/FB).</p>
          <p><strong>Handle objections:</strong> "We already sell on Lazada" → "Great, we add another buyer stream with no platform fee on intros." · "We don't dropship" → "We can route quotes only; you fulfill normally." · "Need exclusivity" → "Not a fit yet; we list multiple suppliers per part."</p>
          <p><strong>Close:</strong> Send onboarding link to <code>/partners/parts/onboarding</code> and set a 48h follow-up.</p>
        </div>
      </details>
    </Panel>
  );
}

function LogCallForm({ supplier, contacts, onLogged }: { supplier: any; contacts: any[]; onLogged: () => void }) {
  const log = useServerFn(logOutreach);
  const [channel, setChannel] = useState("call");
  const [outcome, setOutcome] = useState("spoke");
  const [contactId, setContactId] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [stage, setStage] = useState<string>(supplier.pipeline_stage);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await log({ data: {
        supplier_id: supplier.id,
        contact_id: contactId || null,
        channel: channel as any,
        outcome: outcome as any,
        summary: summary || null,
        next_action: nextAction || null,
        next_action_at: nextAt ? new Date(nextAt).toISOString() : null,
        pipeline_stage: stage !== supplier.pipeline_stage ? (stage as any) : undefined,
      }});
      toast.success("Logged");
      setSummary(""); setNextAction(""); setNextAt("");
      onLogged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Panel title="Log a touch" icon={<MessageSquare className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Field label="Channel">
          <select value={channel} onChange={e => setChannel(e.target.value)} className={inputCls}>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Outcome">
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className={inputCls}>
            {OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Move to stage">
          <select value={stage} onChange={e => setStage(e.target.value)} className={inputCls}>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Contact" full>
          <select value={contactId} onChange={e => setContactId(e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.title ? `(${c.title})` : ""}</option>)}
          </select>
        </Field>
        <Field label="Summary" full>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className={inputCls} placeholder="What was said?" />
        </Field>
        <Field label="Next action">
          <input value={nextAction} onChange={e => setNextAction(e.target.value)} className={inputCls} placeholder="Send onboarding link…" />
        </Field>
        <Field label="Next action when">
          <input type="datetime-local" value={nextAt} onChange={e => setNextAt(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={submit} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" /> Log touch</Button>
      </div>
    </Panel>
  );
}

function OpsPanel({ supplier, onSaved }: { supplier: any; onSaved: () => void }) {
  const upd = useServerFn(updateSupplierOps);
  const [d, setD] = useState<any>(supplier);
  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }));
  async function save() {
    try {
      await upd({ data: {
        id: d.id,
        pipeline_stage: d.pipeline_stage,
        lead_score: Number(d.lead_score) || 0,
        do_not_contact: !!d.do_not_contact,
        lost_reason: d.lost_reason || null,
        address: d.address || null,
        city: d.city || null,
        province: d.province || null,
        google_maps_url: d.google_maps_url || null,
        business_hours: d.business_hours || null,
      }});
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <Panel title="Pipeline & location" icon={<Flag className="h-4 w-4" />} action={<Button size="sm" variant="outline" onClick={save}><Save className="mr-1 h-3.5 w-3.5" />Save</Button>}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Stage">
          <select value={d.pipeline_stage} onChange={e => set("pipeline_stage", e.target.value)} className={inputCls}>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Lead score (0–100)">
          <input type="number" min={0} max={100} value={d.lead_score ?? 0} onChange={e => set("lead_score", e.target.value)} className={inputCls} />
        </Field>
        <Field label="City"><input value={d.city ?? ""} onChange={e => set("city", e.target.value)} className={inputCls} /></Field>
        <Field label="Province"><input value={d.province ?? ""} onChange={e => set("province", e.target.value)} className={inputCls} /></Field>
        <Field label="Address" full><input value={d.address ?? ""} onChange={e => set("address", e.target.value)} className={inputCls} /></Field>
        <Field label="Business hours"><input value={d.business_hours ?? ""} onChange={e => set("business_hours", e.target.value)} className={inputCls} placeholder="Mon–Sat 8am–5pm" /></Field>
        <Field label="Google Maps URL"><input value={d.google_maps_url ?? ""} onChange={e => set("google_maps_url", e.target.value)} className={inputCls} /></Field>
        <Field label="Lost reason (if Lost)" full><input value={d.lost_reason ?? ""} onChange={e => set("lost_reason", e.target.value)} className={inputCls} /></Field>
        <label className="col-span-2 inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!d.do_not_contact} onChange={e => set("do_not_contact", e.target.checked)} />
          Do not contact
        </label>
      </div>
    </Panel>
  );
}

function ContactsPanel({ supplierId, contacts, onChanged }: { supplierId: string; contacts: any[]; onChanged: () => void }) {
  const up = useServerFn(upsertSupplierContact);
  const del = useServerFn(deleteSupplierContact);
  const [draft, setDraft] = useState<any | null>(null);
  return (
    <Panel title={`Contacts (${contacts.length})`} icon={<Phone className="h-4 w-4" />} action={
      <Button size="sm" variant="outline" onClick={() => setDraft({ supplier_id: supplierId, role: "purchasing", name: "" })}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add
      </Button>
    }>
      <div className="space-y-2">
        {contacts.map(c => (
          <div key={c.id} className="flex items-start justify-between gap-2 rounded border border-border bg-card p-2 text-xs">
            <div className="min-w-0">
              <div className="font-medium">
                {c.is_primary && <Star className="mr-1 inline h-3 w-3 fill-amber-500 text-amber-500" />}
                {c.name} <span className="text-muted-foreground">{c.title ? `· ${c.title}` : ""} · {c.role}</span>
              </div>
              <div className="text-muted-foreground">
                {c.phone && <a href={`tel:${c.phone}`} className="mr-2 text-primary hover:underline">{c.phone}</a>}
                {c.mobile && <a href={`tel:${c.mobile}`} className="mr-2 text-primary hover:underline">{c.mobile}</a>}
                {c.email && <a href={`mailto:${c.email}`} className="mr-2 text-primary hover:underline">{c.email}</a>}
                {c.viber && <span className="mr-2">Viber: {c.viber}</span>}
              </div>
              {c.notes && <div className="mt-1 italic">{c.notes}</div>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => setDraft(c)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Delete contact?")) return;
                await del({ data: { id: c.id } }); toast.success("Deleted"); onChanged();
              }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-xs text-muted-foreground">No contacts yet.</p>}
      </div>
      {draft && (
        <ContactEditor
          row={draft}
          onCancel={() => setDraft(null)}
          onSave={async (payload) => {
            try {
              await up({ data: payload });
              toast.success("Saved");
              setDraft(null);
              onChanged();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
        />
      )}
    </Panel>
  );
}

function ContactEditor({ row, onCancel, onSave }: { row: any; onCancel: () => void; onSave: (r: any) => void }) {
  const [d, setD] = useState<any>({ ...row });
  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="mt-2 rounded border border-primary/40 bg-primary/5 p-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Name"><input value={d.name ?? ""} onChange={e => set("name", e.target.value)} className={inputCls} /></Field>
        <Field label="Title"><input value={d.title ?? ""} onChange={e => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="Role">
          <select value={d.role} onChange={e => set("role", e.target.value)} className={inputCls}>
            {["owner", "purchasing", "parts_manager", "ecom", "ap", "other"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Preferred channel">
          <select value={d.preferred_channel ?? ""} onChange={e => set("preferred_channel", e.target.value)} className={inputCls}>
            <option value="">—</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Phone"><input value={d.phone ?? ""} onChange={e => set("phone", e.target.value)} className={inputCls} /></Field>
        <Field label="Mobile"><input value={d.mobile ?? ""} onChange={e => set("mobile", e.target.value)} className={inputCls} /></Field>
        <Field label="Email"><input value={d.email ?? ""} onChange={e => set("email", e.target.value)} className={inputCls} /></Field>
        <Field label="Viber"><input value={d.viber ?? ""} onChange={e => set("viber", e.target.value)} className={inputCls} /></Field>
        <Field label="WhatsApp"><input value={d.whatsapp ?? ""} onChange={e => set("whatsapp", e.target.value)} className={inputCls} /></Field>
        <Field label="Messenger"><input value={d.messenger ?? ""} onChange={e => set("messenger", e.target.value)} className={inputCls} /></Field>
        <Field label="Notes" full><textarea value={d.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls} /></Field>
        <label className="col-span-2 inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!d.is_primary} onChange={e => set("is_primary", e.target.checked)} />
          Primary contact
        </label>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(d)}>Save</Button>
      </div>
    </div>
  );
}

function TasksPanel({ supplierId, tasks, onChanged }: { supplierId: string; tasks: any[]; onChanged: () => void }) {
  const up = useServerFn(upsertSupplierTask);
  const del = useServerFn(deleteSupplierTask);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  async function add() {
    if (!title.trim()) return;
    try {
      await up({ data: { supplier_id: supplierId, title: title.trim(), due_at: due ? new Date(due).toISOString() : null, status: "open" } });
      setTitle(""); setDue(""); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <Panel title={`Tasks (${tasks.filter(t => t.status === "open").length} open)`} icon={<Calendar className="h-4 w-4" />}>
      <div className="mb-2 flex flex-wrap gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a task…" className={`${inputCls} flex-1`} />
        <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        <Button size="sm" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
      </div>
      <ul className="space-y-1">
        {tasks.map(t => (
          <li key={t.id} className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-xs">
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={async () => {
                await up({ data: { id: t.id, supplier_id: supplierId, title: t.title, status: t.status === "done" ? "open" : "done" } });
                onChanged();
              }}
            />
            <span className={t.status === "done" ? "flex-1 line-through text-muted-foreground" : "flex-1"}>{t.title}</span>
            {t.due_at && <span className="text-muted-foreground">{new Date(t.due_at).toLocaleDateString()}</span>}
            <button onClick={async () => { await del({ data: { id: t.id } }); onChanged(); }}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-xs text-muted-foreground">No tasks.</li>}
      </ul>
    </Panel>
  );
}

function TimelinePanel({ outreach, contacts }: { outreach: any[]; contacts: any[] }) {
  const byId = Object.fromEntries(contacts.map(c => [c.id, c.name]));
  return (
    <Panel title={`Activity (${outreach.length})`} icon={<MessageSquare className="h-4 w-4" />}>
      {outreach.length === 0 ? (
        <p className="text-xs text-muted-foreground">No touches yet. Log your first call above.</p>
      ) : (
        <ul className="space-y-2">
          {outreach.map(o => (
            <li key={o.id} className="rounded border border-border bg-card p-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{o.channel}</span>
                <span>· {o.outcome.replace(/_/g, " ")}</span>
                {o.contact_id && byId[o.contact_id] && <span>· {byId[o.contact_id]}</span>}
                <span className="ml-auto">{new Date(o.occurred_at).toLocaleString()}</span>
              </div>
              {o.summary && <div className="mt-1">{o.summary}</div>}
              {o.next_action && (
                <div className="mt-1 text-amber-700 dark:text-amber-300">
                  → {o.next_action}{o.next_action_at ? ` (${new Date(o.next_action_at).toLocaleString()})` : ""}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground";
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-[11px] font-medium text-muted-foreground ${full ? "col-span-2 sm:col-span-3" : ""}`}>
      {label}<div className="mt-0.5">{children}</div>
    </label>
  );
}
