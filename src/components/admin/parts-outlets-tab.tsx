import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Save, Trash2, Globe2, MapPin, CheckCircle2 } from "lucide-react";
import {
  adminListCountries,
  adminUpsertCountry,
  adminListOutlets,
  adminUpsertOutlet,
  adminDeleteOutlet,
} from "@/lib/parts-catalog.functions";
import { Button } from "@/components/ui/button";

const OUTLET_TYPES = [
  { value: "oem_dealer", label: "OEM dealer" },
  { value: "parts_shop", label: "Parts shop" },
  { value: "junkyard", label: "Junkyard / salvage" },
  { value: "online", label: "Online seller" },
  { value: "distributor", label: "Distributor" },
];

export function OutletsTab() {
  const listCountries = useServerFn(adminListCountries);
  const upsertCountry = useServerFn(adminUpsertCountry);
  const listOutlets = useServerFn(adminListOutlets);
  const upsertOutlet = useServerFn(adminUpsertOutlet);
  const deleteOutlet = useServerFn(adminDeleteOutlet);

  const [countries, setCountries] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [filter, setFilter] = useState("PH");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [c, o] = await Promise.all([
        listCountries(),
        listOutlets({ data: { country: filter || undefined } }),
      ]);
      setCountries(c);
      setOutlets(o);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [filter]);

  async function toggleCountry(c: any) {
    try {
      await upsertCountry({
        data: {
          code: c.code,
          name: c.name,
          currency_code: c.currency_code,
          is_active: !c.is_active,
          sort_order: c.sort_order,
        },
      });
      toast.success(`${c.name} ${!c.is_active ? "activated" : "deactivated"}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function saveOutlet(row: any) {
    try {
      await upsertOutlet({ data: row });
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function removeOutlet(id: string) {
    if (!confirm("Delete this outlet?")) return;
    try {
      await deleteOutlet({ data: { id } });
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  const filtered = useMemo(() => outlets, [outlets]);

  return (
    <div className="space-y-6">
      {/* Countries */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Markets</h2>
          <p className="ml-auto text-xs text-muted-foreground">
            Toggle a country to open it up to customers. PH is the launch market.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => (
            <div
              key={c.code}
              className="flex items-center justify-between rounded-md border border-border bg-background p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {c.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({c.code} · {c.currency_code})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.is_active ? "Active" : "Hidden"}
                  {c.launched_at ? ` · launched ${new Date(c.launched_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <Button size="sm" variant={c.is_active ? "secondary" : "default"} onClick={() => toggleCountry(c)}>
                {c.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Outlets */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Outlets</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() =>
              setEditing({
                country_code: filter || "PH",
                name: "",
                slug: "",
                outlet_type: "parts_shop",
                brands: [],
                is_active: true,
                is_verified: false,
                is_d2c_enabled: false,
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> New outlet
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outlets yet for this market. Add OEM dealers, parts shops, junkyards, and online
            sellers we’ll source from for D2C fulfilment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Brands</th>
                  <th className="p-2">Location</th>
                  <th className="p-2">Flags</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-2">
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-muted-foreground">{o.country_code} · {o.slug}</div>
                    </td>
                    <td className="p-2">{o.outlet_type}</td>
                    <td className="p-2 text-xs">{(o.brands ?? []).join(", ") || "—"}</td>
                    <td className="p-2 text-xs">{[o.city, o.region].filter(Boolean).join(", ") || "—"}</td>
                    <td className="p-2 text-xs">
                      {o.is_verified && <span className="mr-1 inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> verified</span>}
                      {o.is_d2c_enabled && <span className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">D2C</span>}
                      {!o.is_active && <span className="rounded bg-muted px-1.5 py-0.5">hidden</span>}
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(o)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeOutlet(o.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <OutletEditor
          row={editing}
          countries={countries}
          onCancel={() => setEditing(null)}
          onSave={saveOutlet}
        />
      )}
    </div>
  );
}

function OutletEditor({
  row,
  countries,
  onCancel,
  onSave,
}: {
  row: any;
  countries: any[];
  onCancel: () => void;
  onSave: (r: any) => void;
}) {
  const [draft, setDraft] = useState<any>({ ...row });
  const [brandsText, setBrandsText] = useState<string>((row.brands ?? []).join(", "));

  function update<K extends string>(k: K, v: any) {
    setDraft((d: any) => ({ ...d, [k]: v }));
  }

  function submit() {
    const payload = {
      ...draft,
      brands: brandsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      slug: draft.slug?.trim().toLowerCase(),
      latitude: draft.latitude === "" || draft.latitude == null ? null : Number(draft.latitude),
      longitude: draft.longitude === "" || draft.longitude == null ? null : Number(draft.longitude),
      commission_pct:
        draft.commission_pct === "" || draft.commission_pct == null ? null : Number(draft.commission_pct),
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold">{row.id ? "Edit outlet" : "New outlet"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Country">
            <select
              value={draft.country_code}
              onChange={(e) => update("country_code", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Outlet type">
            <select
              value={draft.outlet_type}
              onChange={(e) => update("outlet_type", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {OUTLET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Name"><Input value={draft.name} onChange={(v) => update("name", v)} /></Field>
          <Field label="Slug (url-safe)"><Input value={draft.slug} onChange={(v) => update("slug", v)} /></Field>
          <Field label="Brands carried (comma-separated)" full>
            <Input value={brandsText} onChange={setBrandsText} placeholder="Toyota, Honda, Mitsubishi" />
          </Field>
          <Field label="Region"><Input value={draft.region ?? ""} onChange={(v) => update("region", v)} /></Field>
          <Field label="City"><Input value={draft.city ?? ""} onChange={(v) => update("city", v)} /></Field>
          <Field label="Address" full><Input value={draft.address ?? ""} onChange={(v) => update("address", v)} /></Field>
          <Field label="Latitude"><Input value={draft.latitude ?? ""} onChange={(v) => update("latitude", v)} /></Field>
          <Field label="Longitude"><Input value={draft.longitude ?? ""} onChange={(v) => update("longitude", v)} /></Field>
          <Field label="Phone"><Input value={draft.phone ?? ""} onChange={(v) => update("phone", v)} /></Field>
          <Field label="Email"><Input value={draft.email ?? ""} onChange={(v) => update("email", v)} /></Field>
          <Field label="Website" full><Input value={draft.website ?? ""} onChange={(v) => update("website", v)} placeholder="https://" /></Field>
          <Field label="Contact name"><Input value={draft.contact_name ?? ""} onChange={(v) => update("contact_name", v)} /></Field>
          <Field label="Contact role"><Input value={draft.contact_role ?? ""} onChange={(v) => update("contact_role", v)} /></Field>
          <Field label="Commission %"><Input value={draft.commission_pct ?? ""} onChange={(v) => update("commission_pct", v)} /></Field>
          <Field label="Notes (internal)" full>
            <textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
          </Field>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <Check label="Active" checked={!!draft.is_active} onChange={(v) => update("is_active", v)} />
            <Check label="Verified" checked={!!draft.is_verified} onChange={(v) => update("is_verified", v)} />
            <Check label="D2C enabled" checked={!!draft.is_d2c_enabled} onChange={(v) => update("is_d2c_enabled", v)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit}><Save className="mr-1 h-4 w-4" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs font-medium text-muted-foreground ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Input({ value, onChange, placeholder }: { value: any; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
    />
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
