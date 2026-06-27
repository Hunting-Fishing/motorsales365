import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Handshake, ExternalLink, FileText, Download } from "lucide-react";
import {
  adminListPartnerApplications,
  adminUpdatePartnerApplication,
  adminGetSupplierDocUrl,
} from "@/lib/partner-applications.functions";

type DocRow = { name: string; path: string; size?: number; type?: string; kind?: string };

type Row = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  country: string;
  business_kind: string;
  partnership_type: string;
  monthly_volume: string | null;
  brands_carried: string | null;
  notes: string | null;
  status: "pending" | "reviewing" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  storefront_slug: string | null;
  storefront_published: boolean;
  storefront_blurb: string | null;
  storefront_logo_url: string | null;
  storefront_categories: string[] | null;
  // onboarding
  legal_business_name: string | null;
  tax_id: string | null;
  business_address: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  years_in_business: number | null;
  warehouse_locations: string | null;
  ships_nationwide: boolean | null;
  payment_terms: string | null;
  catalog_feed_url: string | null;
  catalog_feed_format: string | null;
  documents: DocRow[] | null;
  agreed_terms: boolean | null;
};


const STATUSES: Row["status"][] = ["pending", "reviewing", "approved", "rejected"];

export function PartnerApplicationsTab() {
  const list = useServerFn(adminListPartnerApplications);
  const update = useServerFn(adminUpdatePartnerApplication);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setRows((await list()) as Row[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: Row["status"]) {
    try {
      await update({ data: { id, status } });
      toast.success("Updated");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Parts partner applications</h2>
        <span className="text-xs text-muted-foreground">· {rows.length} total</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs font-medium">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="all">all</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No applications {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{r.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.contact_name} · {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} · {r.country} · {r.business_kind} ·{" "}
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      {r.partnership_type}
                    </span>
                  </p>
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {r.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value as Row["status"])}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {(r.monthly_volume || r.brands_carried) && (
                <p className="mt-2 text-xs">
                  {r.monthly_volume && (
                    <span className="mr-3">
                      <span className="font-medium">Volume:</span> {r.monthly_volume}
                    </span>
                  )}
                  {r.brands_carried && (
                    <span>
                      <span className="font-medium">Brands:</span> {r.brands_carried}
                    </span>
                  )}
                </p>
              )}
              {r.notes && (
                <p className="mt-2 rounded bg-background/50 p-2 text-xs">
                  <span className="font-medium">Notes:</span> {r.notes}
                </p>
              )}
              {r.status === "approved" && (
                <StorefrontEditor row={r} onSaved={refresh} />
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

function StorefrontEditor({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const update = useServerFn(adminUpdatePartnerApplication);
  const [slug, setSlug] = useState(row.storefront_slug ?? "");
  const [blurb, setBlurb] = useState(row.storefront_blurb ?? "");
  const [logo, setLogo] = useState(row.storefront_logo_url ?? "");
  const [cats, setCats] = useState((row.storefront_categories ?? []).join(", "));
  const [published, setPublished] = useState(row.storefront_published);
  const [saving, setSaving] = useState(false);

  async function save(nextPublished?: boolean) {
    setSaving(true);
    try {
      await update({
        data: {
          id: row.id,
          storefront_slug: slug || null,
          storefront_blurb: blurb || null,
          storefront_logo_url: logo || null,
          storefront_categories: cats
            ? cats.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          storefront_published: nextPublished ?? published,
        },
      });
      if (nextPublished !== undefined) setPublished(nextPublished);
      toast.success("Storefront saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
      <p className="mb-2 flex items-center gap-1 font-semibold text-primary">
        <Handshake className="h-3 w-3" /> Public storefront
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-medium">URL slug (/shop/…)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="banawe-toyota-parts"
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Logo URL</span>
          <input
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://…"
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-medium">Blurb (shown on storefront)</span>
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={2}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-medium">Categories (comma separated)</span>
          <input
            value={cats}
            onChange={(e) => setCats(e.target.value)}
            placeholder="Engines, Transmissions, Suspension"
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => save()}
          disabled={saving || !slug}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          onClick={() => save(!published)}
          disabled={saving || !slug}
          className={`rounded px-3 py-1 text-xs font-medium ${published ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"} disabled:opacity-50`}
        >
          {published ? "Unpublish" : "Publish to /shop/" + (slug || "…")}
        </button>
        {published && slug && (
          <a
            href={`/shop/${slug}`}
            target="_blank"
            rel="noopener"
            className="text-primary hover:underline"
          >
            View live →
          </a>
        )}
      </div>
    </div>
  );
}

