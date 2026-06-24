import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wrench, Tag, ClipboardList, CheckSquare, Plus, Trash2, Save, Inbox } from "lucide-react";
import {
  adminListCatalog,
  adminUpsertCatalog,
  adminDeleteCatalog,
  adminListTireSpecs,
  adminUpsertTireSpec,
  adminDeleteTireSpec,
  adminListQuoteRequests,
  adminUpdateQuoteRequest,
  adminListPartsInterest,
  adminUpdatePartsInterest,
} from "@/lib/parts-fulfillment.functions";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/admin/parts")({
  component: AdminPartsPage,
  head: () => ({ meta: [{ title: "Parts Fulfillment — Admin" }] }),
});

type Tab = "catalog" | "quotes" | "tires" | "setup";

function AdminPartsPage() {
  const [tab, setTab] = useState<Tab>("quotes");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Parts Fulfillment</h1>
        <p className="text-sm text-muted-foreground">
          In-house parts sales: catalog, vehicle tire data, buyer quote requests, and setup
          checklist for the accounts/integrations we need.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
        <TabButton active={tab === "quotes"} onClick={() => setTab("quotes")}>
          <ClipboardList className="h-4 w-4" /> Quote requests
        </TabButton>
        <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")}>
          <Tag className="h-4 w-4" /> Catalog
        </TabButton>
        <TabButton active={tab === "tires"} onClick={() => setTab("tires")}>
          <Wrench className="h-4 w-4" /> Tire specs
        </TabButton>
        <TabButton active={tab === "setup"} onClick={() => setTab("setup")}>
          <CheckSquare className="h-4 w-4" /> Setup checklist
        </TabButton>
      </div>

      {tab === "quotes" && <QuotesTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "tires" && <TireSpecsTab />}
      {tab === "setup" && <SetupTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Quotes ----------

function QuotesTab() {
  const list = useServerFn(adminListQuoteRequests);
  const update = useServerFn(adminUpdateQuoteRequest);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list({ data: { status } });
      setRows(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setRowStatus(id: string, next: string) {
    await update({ data: { id, status: next as any } });
    toast.success("Updated");
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium">Filter:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          {["all", "new", "quoted", "accepted", "rejected", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{rows.length} request(s)</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No quote requests yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.contact_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.contact_phone || "—"} · {r.contact_email || "—"} · {r.delivery_method}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} ·{" "}
                    {r.listing_id ? `Listing ${r.listing_id.slice(0, 8)}` : "No listing"}
                  </p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => setRowStatus(r.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {["new", "quoted", "accepted", "rejected", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {(r.items ?? []).map((it: any, i: number) => (
                  <li key={i}>
                    {it.label}
                    {it.qty ? ` × ${it.qty}` : ""}
                  </li>
                ))}
              </ul>
              {r.notes && (
                <p className="mt-2 rounded bg-background/50 p-2 text-xs">
                  <span className="font-medium">Notes:</span> {r.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Catalog ----------

function CatalogTab() {
  const list = useServerFn(adminListCatalog);
  const upsert = useServerFn(adminUpsertCatalog);
  const del = useServerFn(adminDeleteCatalog);
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);

  async function refresh() {
    const r = await list();
    setRows(r);
  }
  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setDraft({
      slug: "",
      title: "",
      description: "",
      category: "brakes",
      base_price_php: null,
      photo_url: "",
      compatible_makes: [],
      compatible_models: [],
      year_min: null,
      year_max: null,
      active: true,
      sort_order: 100,
    });
  }

  async function save() {
    try {
      await upsert({ data: cleanCatalog(draft) });
      toast.success("Saved");
      setDraft(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this part?")) return;
    await del({ data: { id } });
    toast.success("Deleted");
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} catalog items</p>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {draft && (
        <div className="rounded-lg border border-primary bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Slug"
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: v })}
            />
            <Input
              label="Title"
              value={draft.title}
              onChange={(v) => setDraft({ ...draft, title: v })}
            />
            <Input
              label="Category"
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
            />
            <Input
              label="Base price (PHP)"
              type="number"
              value={draft.base_price_php ?? ""}
              onChange={(v) =>
                setDraft({ ...draft, base_price_php: v === "" ? null : Number(v) })
              }
            />
            <Input
              label="Compatible makes (comma separated)"
              value={(draft.compatible_makes ?? []).join(", ")}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  compatible_makes: v
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <Input
              label="Photo URL"
              value={draft.photo_url ?? ""}
              onChange={(v) => setDraft({ ...draft, photo_url: v })}
            />
            <Input
              label="Sort order"
              type="number"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: Number(v) || 0 })}
            />
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={!!draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">Description</label>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-md border px-3 py-1 text-sm">
              Cancel
            </button>
            <button
              onClick={save}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Makes</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.category}</td>
                <td className="px-3 py-2 text-xs">
                  {r.base_price_php ? formatPHP(Number(r.base_price_php)) : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {(r.compatible_makes ?? []).join(", ") || "any"}
                </td>
                <td className="px-3 py-2 text-xs">{r.active ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setDraft(r)}
                    className="mr-2 text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="inline h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cleanCatalog(d: any) {
  return {
    ...d,
    description: d.description || null,
    photo_url: d.photo_url || null,
    base_price_php: d.base_price_php ?? null,
    year_min: d.year_min ?? null,
    year_max: d.year_max ?? null,
  };
}

// ---------- Tire specs ----------

function TireSpecsTab() {
  const list = useServerFn(adminListTireSpecs);
  const upsert = useServerFn(adminUpsertTireSpec);
  const del = useServerFn(adminDeleteTireSpec);
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  async function refresh() {
    setRows(await list());
  }
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) => !q || r.make.toLowerCase().includes(q) || r.model.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function save() {
    try {
      await upsert({ data: { ...draft } });
      toast.success("Saved");
      setDraft(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        <input
          placeholder="Search make/model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          onClick={() =>
            setDraft({
              make: "",
              model: "",
              year_min: null,
              year_max: null,
              front_size: "",
              rear_size: "",
              notes: "",
            })
          }
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add tire spec
        </button>
      </div>

      {draft && (
        <div className="rounded-lg border border-primary bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input label="Make" value={draft.make} onChange={(v) => setDraft({ ...draft, make: v })} />
            <Input
              label="Model"
              value={draft.model}
              onChange={(v) => setDraft({ ...draft, model: v })}
            />
            <div />
            <Input
              label="Year min"
              type="number"
              value={draft.year_min ?? ""}
              onChange={(v) => setDraft({ ...draft, year_min: v === "" ? null : Number(v) })}
            />
            <Input
              label="Year max"
              type="number"
              value={draft.year_max ?? ""}
              onChange={(v) => setDraft({ ...draft, year_max: v === "" ? null : Number(v) })}
            />
            <div />
            <Input
              label="Front size"
              value={draft.front_size ?? ""}
              onChange={(v) => setDraft({ ...draft, front_size: v })}
            />
            <Input
              label="Rear size"
              value={draft.rear_size ?? ""}
              onChange={(v) => setDraft({ ...draft, rear_size: v })}
            />
            <Input
              label="Notes"
              value={draft.notes ?? ""}
              onChange={(v) => setDraft({ ...draft, notes: v })}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-md border px-3 py-1 text-sm">
              Cancel
            </button>
            <button
              onClick={save}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Years</th>
              <th className="px-3 py-2">Front</th>
              <th className="px-3 py-2">Rear</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {r.make} {r.model}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.year_min ?? "—"}–{r.year_max ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs">{r.front_size ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.rear_size ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setDraft(r)}
                    className="mr-2 text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await del({ data: { id: r.id } });
                      refresh();
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="inline h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Setup checklist ----------

const SETUP_ITEMS: { area: string; items: { label: string; note: string }[] }[] = [
  {
    area: "Parts suppliers",
    items: [
      {
        label: "Local OEM/aftermarket distributors",
        note: "Open trade accounts with 2-3 distributors per category (brakes, suspension, electrical).",
      },
      {
        label: "OEM dealer parts contacts",
        note: "Direct lines for genuine parts on Toyota, Honda, Mitsubishi, Ford, Isuzu, Nissan.",
      },
    ],
  },
  {
    area: "Tires",
    items: [
      {
        label: "Tire wholesalers (Yokohama PH, GT Radial, Dunlop, Bridgestone)",
        note: "Wholesale pricing per size. Confirm minimum-order terms.",
      },
      {
        label: "Tire fitment data source",
        note: "Start with internal vehicle_tire_specs table. Optional later: Tecdoc / TireSize.com API.",
      },
    ],
  },
  {
    area: "Payments & invoicing",
    items: [
      {
        label: "Stripe (already wired)",
        note: "When inventory + shipping are ready, swap 'Request quote' for embedded checkout against parts_catalog SKUs.",
      },
      { label: "Manual GCash/Maya/bank invoice template", note: "For quotes accepted via DM/phone." },
    ],
  },
  {
    area: "Logistics",
    items: [
      {
        label: "Courier accounts (LBC, J&T, Lalamove)",
        note: "Shipping rate sheets + serviceable areas per courier.",
      },
      { label: "Pickup location SOP", note: "Where buyers collect, hours, ID requirements." },
    ],
  },
  {
    area: "Policy & support",
    items: [
      { label: "Returns & warranty policy doc", note: "Add to /refund-policy when checkout goes live." },
      { label: "Terms — parts sales addendum", note: "Add to /terms with effective date when live." },
    ],
  },
];

function SetupTab() {
  return (
    <div className="space-y-4">
      <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
        Operational checklist for everything needed before in-house parts sales can ship at scale.
        Currently the buyer flow is <span className="font-medium">quote-only</span> — no payment
        until each item below is in place.
      </p>
      {SETUP_ITEMS.map((sec) => (
        <div key={sec.area} className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-display text-sm font-semibold">{sec.area}</h3>
          <ul className="mt-2 space-y-2">
            {sec.items.map((i) => (
              <li key={i.label} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-border" />
                <div>
                  <p className="font-medium">{i.label}</p>
                  <p className="text-xs text-muted-foreground">{i.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------- Shared input ----------

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
    </div>
  );
}
