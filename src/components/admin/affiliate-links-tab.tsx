import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Save, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminListAffiliateLinks,
  adminUpsertAffiliateLink,
  adminDeleteAffiliateLink,
  adminAffiliateClickStats,
  adminPingInvolveAsia,
} from "@/lib/affiliate.functions";

type Row = {
  id?: string;
  supplier_slug: string;
  label: string;
  region: string;
  logo_url: string | null;
  url_template: string;
  affiliate_id_env: string | null;
  network: string | null;
  commission_note: string | null;
  is_active: boolean;
  priority: number;
};

const BLANK: Row = {
  supplier_slug: "",
  label: "",
  region: "PH",
  logo_url: "",
  url_template: "https://example.com/search?q={QUERY}",
  affiliate_id_env: "",
  network: "",
  commission_note: "",
  is_active: false,
  priority: 100,
};

export function AffiliateLinksTab() {
  const list = useServerFn(adminListAffiliateLinks);
  const upsert = useServerFn(adminUpsertAffiliateLink);
  const remove = useServerFn(adminDeleteAffiliateLink);
  const stats = useServerFn(adminAffiliateClickStats);
  const pingIA = useServerFn(adminPingInvolveAsia);
  const [rows, setRows] = useState<Row[]>([]);
  const [clicks, setClicks] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function refresh() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([list(), stats()]);
      setRows(r as Row[]);
      setClicks(s as Record<string, number>);
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

  async function save() {
    if (!editing) return;
    try {
      await upsert({
        data: {
          ...editing,
          logo_url: editing.logo_url || null,
          affiliate_id_env: editing.affiliate_id_env || null,
          network: editing.network || null,
          commission_note: editing.commission_note || null,
        },
      });
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this affiliate link?")) return;
    await remove({ data: { id } });
    toast.success("Deleted");
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Templates for tagged outbound deep-links. Use{" "}
          <code className="rounded bg-muted px-1">{`{QUERY}`}</code> for the search
          term. Set <em>Affiliate ID env</em> to <code className="rounded bg-muted px-1">INVOLVE_ASIA</code>{" "}
          to mint tracked links via the Involve Asia deeplink API.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const r = await pingIA();
                r.ok ? toast.success(r.message) : toast.error(r.message);
              } catch (e: any) {
                toast.error(e?.message ?? "Ping failed");
              }
            }}
          >
            Test Involve Asia
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setEditing({
                ...BLANK,
                region: "PH",
                network: "Involve Asia",
                affiliate_id_env: "INVOLVE_ASIA",
                url_template: "https://shopee.ph/search?keyword={QUERY}",
                commission_note: "Tracked via Involve Asia deeplink API",
                is_active: true,
                priority: 10,
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add Involve Asia merchant
          </Button>
          <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
            <Plus className="mr-1 h-4 w-4" /> Add supplier
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Affiliate ID env</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Clicks (30d)</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const idSet = r.affiliate_id_env
                  ? "configured by name"
                  : "—";
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.label}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.supplier_slug}
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.region}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.affiliate_id_env ?? "—"}
                      <div className="text-[10px] text-muted-foreground">{idSet}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          r.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {clicks[r.supplier_slug] ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => r.id && del(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-bold">
              {editing.id ? "Edit supplier" : "Add supplier"}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Slug (unique)">
                <input
                  className="input"
                  value={editing.supplier_slug}
                  onChange={(e) =>
                    setEditing({ ...editing, supplier_slug: e.target.value })
                  }
                />
              </Field>
              <Field label="Label">
                <input
                  className="input"
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                />
              </Field>
              <Field label="Region (PH / SEA / GLOBAL)">
                <input
                  className="input"
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                />
              </Field>
              <Field label="Priority (low = top)">
                <input
                  type="number"
                  className="input"
                  value={editing.priority}
                  onChange={(e) =>
                    setEditing({ ...editing, priority: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Network">
                <input
                  className="input"
                  value={editing.network ?? ""}
                  onChange={(e) => setEditing({ ...editing, network: e.target.value })}
                />
              </Field>
              <Field label="Affiliate ID env var name">
                <input
                  className="input font-mono text-xs"
                  value={editing.affiliate_id_env ?? ""}
                  placeholder="SHOPEE_AFFILIATE_ID"
                  onChange={(e) =>
                    setEditing({ ...editing, affiliate_id_env: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="URL template (use {QUERY} placeholder)">
              <input
                className="input font-mono text-xs"
                value={editing.url_template}
                onChange={(e) =>
                  setEditing({ ...editing, url_template: e.target.value })
                }
              />
            </Field>
            <Field label="Logo URL (optional)">
              <input
                className="input"
                value={editing.logo_url ?? ""}
                onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
              />
            </Field>
            <Field label="Commission note (internal)">
              <textarea
                className="input"
                rows={2}
                value={editing.commission_note ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, commission_note: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
              />
              Active (visible to users)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
            </div>
            {editing.id && (
              <p className="text-xs text-muted-foreground">
                Outbound test:{" "}
                <a
                  className="inline-flex items-center gap-1 underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/public/go/${editing.supplier_slug}?q=brake+pads`}
                >
                  /api/public/go/{editing.supplier_slug} <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border-radius:.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.375rem .5rem;font-size:.875rem;}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

