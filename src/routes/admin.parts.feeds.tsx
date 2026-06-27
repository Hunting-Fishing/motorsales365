import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Power, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminListFeeds,
  adminToggleFeed,
  adminSyncFeed,
} from "@/lib/partner-feed.functions";

export const Route = createFileRoute("/admin/parts/feeds")({
  component: FeedsPage,
  head: () => ({ meta: [{ title: "Product Feeds — Admin" }] }),
});

type Feed = {
  id: string;
  network: string;
  merchant_slug: string;
  merchant_label: string;
  country: string;
  is_enabled: boolean;
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
  item_count: number;
};

function FeedsPage() {
  const list = useServerFn(adminListFeeds);
  const toggle = useServerFn(adminToggleFeed);
  const sync = useServerFn(adminSyncFeed);
  const [rows, setRows] = useState<Feed[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => list().then((r) => setRows(r as Feed[])).catch(() => setRows([]));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin/parts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Back to Parts Fulfillment
          </a>
          <h1 className="font-display text-2xl font-bold">Product Feeds</h1>
          <p className="text-sm text-muted-foreground">
            Auto-pull product catalogs from Lazada, Shopee, AliExpress (via Involve Asia)
            into the universal Shop widget. Daily cron + manual sync.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feeds configured.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Merchant</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Last sync</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.merchant_label}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {f.network} · {f.merchant_slug}
                    </div>
                  </td>
                  <td className="px-3 py-2">{f.country}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        f.last_status === "ok"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : f.last_status === "error"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {f.last_status ?? "never run"}
                    </span>
                    {!f.is_enabled && (
                      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        disabled
                      </span>
                    )}
                    {f.last_error && (
                      <div className="mt-1 max-w-xs truncate text-[10px] text-red-600" title={f.last_error}>
                        {f.last_error}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{f.item_count}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {f.last_synced_at ? new Date(f.last_synced_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === f.id}
                        onClick={async () => {
                          setBusyId(f.id);
                          try {
                            const r = await sync({ data: { id: f.id } });
                            (r as any).ok
                              ? toast.success(`Synced ${(r as any).count} items`)
                              : toast.error((r as any).error ?? "Sync failed");
                            refresh();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Sync failed");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Sync now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await toggle({ data: { id: f.id, is_enabled: !f.is_enabled } });
                          refresh();
                        }}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
