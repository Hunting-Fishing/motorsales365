import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Save, Trash2, Star, ExternalLink, Globe2, KeyRound, Truck, Cog, Search,
} from "lucide-react";
import {
  adminListSuppliers,
  adminUpsertSupplier,
  adminDeleteSupplier,
} from "@/lib/parts-suppliers.functions";
import { Button } from "@/components/ui/button";

const REGIONS = ["PH", "JP", "CN", "IN", "PK", "US", "EU", "AE", "SEA", "global"];
const CATEGORIES = [
  { value: "oem_dealer", label: "OEM dealer" },
  { value: "oem_distributor", label: "OEM distributor" },
  { value: "aftermarket", label: "Aftermarket" },
  { value: "aggregator", label: "Aggregator / catalog" },
  { value: "online", label: "Online marketplace" },
  { value: "wholesale", label: "Wholesale" },
  { value: "parts_shop", label: "Parts shop" },
  { value: "junkyard", label: "Junkyard / salvage" },
];
const SIGNUP_STATUS = ["not_started", "researching", "applied", "approved", "active", "rejected", "paused"];
const API_STATUS = ["none", "available_no_account", "pending_keys", "sandbox", "live", "deprecated"];

function statusColor(s: string) {
  switch (s) {
    case "active":
    case "live":
    case "approved": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "applied":
    case "pending_keys":
    case "sandbox":
    case "researching": return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "rejected":
    case "deprecated": return "bg-destructive/15 text-destructive";
    case "paused": return "bg-muted text-muted-foreground";
    default: return "bg-secondary text-foreground";
  }
}

export function SuppliersTab() {
  const list = useServerFn(adminListSuppliers);
  const upsert = useServerFn(adminUpsertSupplier);
  const del = useServerFn(adminDeleteSupplier);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [region, setRegion] = useState<string>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try { setRows(await list()); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return rows.filter(r =>
      (region === "all" || r.region === region) &&
      (!term || r.name.toLowerCase().includes(term) || (r.brands ?? []).join(" ").toLowerCase().includes(term))
    );
  }, [rows, region, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.signup_status === "active" || r.signup_status === "approved").length,
    api: rows.filter(r => r.api_status === "live" || r.api_status === "sandbox").length,
    recommended: rows.filter(r => r.is_recommended).length,
  }), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Suppliers" value={stats.total} />
        <Stat label="Active / approved" value={stats.active} accent="emerald" />
        <Stat label="API connected" value={stats.api} accent="primary" />
        <Stat label="Recommended" value={stats.recommended} accent="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or brand…"
            className="w-60 rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm"
          />
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="all">All regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button size="sm" className="ml-auto" onClick={() => setEditing(newDraft())}>
          <Plus className="mr-1 h-4 w-4" /> Add supplier
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Capabilities</th>
                <th className="px-3 py-2">Sign-up</th>
                <th className="px-3 py-2">API</th>
                <th className="px-3 py-2">Links</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 font-medium">
                      {r.is_recommended && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                      {r.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {(r.brands ?? []).slice(0, 5).join(", ") || "—"}
                      {(r.brands?.length ?? 0) > 5 ? "…" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.region}</td>
                  <td className="px-3 py-2 text-xs">{CATEGORIES.find(c => c.value === r.category)?.label ?? r.category}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {r.supports_api && <Cap icon={<KeyRound className="h-3 w-3" />} label="API" />}
                      {r.supports_dropship && <Cap icon={<Truck className="h-3 w-3" />} label="Dropship" />}
                      {r.supports_wholesale && <Cap icon={<Cog className="h-3 w-3" />} label="Wholesale" />}
                      {r.vin_lookup && <Cap icon={<Search className="h-3 w-3" />} label="VIN" />}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor(r.signup_status)}`}>
                      {r.signup_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor(r.api_status)}`}>
                      {r.api_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      {r.signup_url && <LinkOut href={r.signup_url} label="Sign up" />}
                      {r.api_docs_url && <LinkOut href={r.api_docs_url} label="API docs" />}
                      {r.website && <LinkOut href={r.website} label="Site" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`Delete ${r.name}?`)) return;
                      await del({ data: { id: r.id } }); toast.success("Deleted"); refresh();
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No suppliers match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SupplierEditor
          row={editing}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            try {
              await upsert({ data: payload });
              toast.success("Saved");
              setEditing(null);
              refresh();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
        />
      )}
    </div>
  );
}

function newDraft() {
  return {
    name: "", slug: "", website: "", signup_url: "", api_docs_url: "",
    region: "PH", category: "aftermarket", brands: [],
    supports_api: false, supports_dropship: false, supports_wholesale: false, vin_lookup: false,
    signup_status: "not_started", api_status: "none", priority: 100,
    is_recommended: false, account_email: "", account_ref: "",
    contact_name: "", contact_phone: "", commission_notes: "", notes: "",
  };
}

function SupplierEditor({ row, onCancel, onSave }: { row: any; onCancel: () => void; onSave: (r: any) => void }) {
  const [d, setD] = useState<any>({ ...row });
  const [brandsText, setBrandsText] = useState<string>((row.brands ?? []).join(", "));
  function set<K extends string>(k: K, v: any) { setD((p: any) => ({ ...p, [k]: v })); }

  function submit() {
    onSave({
      ...d,
      brands: brandsText.split(",").map(s => s.trim()).filter(Boolean),
      priority: Number(d.priority) || 100,
      slug: (d.slug || d.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold">{row.id ? "Edit supplier" : "New supplier"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Name"><I v={d.name} on={(v) => set("name", v)} /></F>
          <F label="Slug (auto)"><I v={d.slug} on={(v) => set("slug", v)} placeholder="auto from name" /></F>
          <F label="Region">
            <select value={d.region} onChange={(e) => set("region", e.target.value)} className={inputCls}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </F>
          <F label="Category">
            <select value={d.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </F>
          <F label="Brands (comma separated)" full>
            <I v={brandsText} on={setBrandsText} placeholder="Toyota, Honda, Nissan" />
          </F>
          <F label="Website"><I v={d.website} on={(v) => set("website", v)} placeholder="https://" /></F>
          <F label="Signup URL"><I v={d.signup_url} on={(v) => set("signup_url", v)} placeholder="https://" /></F>
          <F label="API docs URL" full><I v={d.api_docs_url} on={(v) => set("api_docs_url", v)} placeholder="https://" /></F>

          <F label="Sign-up status">
            <select value={d.signup_status} onChange={(e) => set("signup_status", e.target.value)} className={inputCls}>
              {SIGNUP_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </F>
          <F label="API status">
            <select value={d.api_status} onChange={(e) => set("api_status", e.target.value)} className={inputCls}>
              {API_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </F>

          <F label="Account email"><I v={d.account_email} on={(v) => set("account_email", v)} /></F>
          <F label="Account reference / ID"><I v={d.account_ref} on={(v) => set("account_ref", v)} /></F>
          <F label="Contact name"><I v={d.contact_name} on={(v) => set("contact_name", v)} /></F>
          <F label="Contact phone"><I v={d.contact_phone} on={(v) => set("contact_phone", v)} /></F>
          <F label="Priority (lower = higher)"><I v={d.priority} on={(v) => set("priority", v)} /></F>
          <div className="flex flex-wrap items-end gap-4">
            <Chk label="API" v={d.supports_api} on={(v) => set("supports_api", v)} />
            <Chk label="Dropship" v={d.supports_dropship} on={(v) => set("supports_dropship", v)} />
            <Chk label="Wholesale" v={d.supports_wholesale} on={(v) => set("supports_wholesale", v)} />
            <Chk label="VIN lookup" v={d.vin_lookup} on={(v) => set("vin_lookup", v)} />
            <Chk label="Recommended" v={d.is_recommended} on={(v) => set("is_recommended", v)} />
          </div>
          <F label="Commission / pricing notes" full>
            <textarea value={d.commission_notes ?? ""} onChange={(e) => set("commission_notes", e.target.value)} rows={2} className={inputCls} />
          </F>
          <F label="Internal notes" full>
            <textarea value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} />
          </F>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit}><Save className="mr-1 h-4 w-4" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground";
function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs font-medium text-muted-foreground ${full ? "sm:col-span-2" : ""}`}>
      {label}<div className="mt-1">{children}</div>
    </label>
  );
}
function I({ v, on, placeholder }: { v: any; on: (v: string) => void; placeholder?: string }) {
  return <input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={placeholder} className={inputCls} />;
}
function Chk({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <input type="checkbox" checked={!!v} onChange={(e) => on(e.target.checked)} /> {label}
    </label>
  );
}
function Cap({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-primary">{icon}{label}</span>;
}
function LinkOut({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 text-primary hover:underline">
      <ExternalLink className="h-3 w-3" />{label}
    </a>
  );
}
function Stat({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "primary" | "amber" }) {
  const color =
    accent === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : accent === "amber" ? "text-amber-600 dark:text-amber-400"
    : accent === "primary" ? "text-primary"
    : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
