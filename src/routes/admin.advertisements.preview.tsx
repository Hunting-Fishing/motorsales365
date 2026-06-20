import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAdSlots } from "@/lib/advertise-slots.functions";
import { getLiveCreativesForSlots } from "@/lib/advertise-slots.functions";

export const Route = createFileRoute("/admin/advertisements/preview")({
  component: AdminAdPreviewPage,
  head: () => ({
    meta: [{ title: "Ad preview — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

function AdminAdPreviewPage() {
  const { isAdmin, canManageAds } = useAuth();
  const hasAccess = isAdmin || canManageAds;
  const [slots, setSlots] = useState<any[]>([]);
  const [live, setLive] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listAdSlots();
      setSlots(res.slots);
      const keys = res.slots.map((s: any) => s.slot_key);
      if (keys.length) {
        const r2: any = await getLiveCreativesForSlots({ data: { slotKeys: keys } });
        setLive(r2.creatives);
      }
      setRefreshedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess]);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of slots) {
      if (!m.has(s.placement)) m.set(s.placement, []);
      m.get(s.placement)!.push(s);
    }
    return Array.from(m.entries());
  }, [slots]);

  if (!hasAccess) return <div className="p-6 text-sm text-muted-foreground">Ads manager role required.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" /> Live ad preview
          </h2>
          <p className="text-sm text-muted-foreground">
            Renders the highest-priority active creative for each slot (advertiser ads beat placeholders).
            {refreshedAt && ` Last refreshed ${refreshedAt.toLocaleTimeString()}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {loading && slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([placement, items]) => (
            <section key={placement} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{placement}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((slot) => (
                  <PreviewTile key={slot.id} slot={slot} creative={live[slot.slot_key] ?? null} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewTile({ slot, creative }: { slot: any; creative: any }) {
  const aspect = slot.aspect_ratio
    ? (() => {
        const [a, b] = String(slot.aspect_ratio).split(":").map(Number);
        return a && b ? `${a} / ${b}` : "16 / 9";
      })()
    : "16 / 9";

  return (
    <div className="rounded-md border bg-card overflow-hidden flex flex-col">
      <div
        className="relative w-full bg-muted"
        style={{ aspectRatio: aspect }}
      >
        {creative ? (
          <>
            <img
              src={creative.image_url}
              alt={creative.alt_text ?? slot.label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <Badge
              className={`absolute left-1 top-1 ${creative.kind === "advertiser" ? "bg-emerald-500" : "bg-primary/90"} text-white`}
            >
              {creative.kind}
            </Badge>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground border-2 border-dashed border-border m-2 rounded">
            Empty slot
          </div>
        )}
      </div>
      <div className="p-3 text-xs space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium">{slot.label}</span>
          {!slot.active && <Badge variant="secondary">inactive</Badge>}
        </div>
        <p className="text-muted-foreground font-mono text-[10px]">{slot.slot_key}</p>
        <p className="text-muted-foreground">
          {slot.min_width}×{slot.min_height}{slot.aspect_ratio ? ` · ${slot.aspect_ratio}` : ""}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Link
            to="/admin/advertisements/placeholders"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            Manage <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
