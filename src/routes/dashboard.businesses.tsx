import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store as StoreIcon, Plus, Check, X, Pencil, Tag, Sparkles, LayoutTemplate, Inbox, Archive, ArchiveRestore } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareQr } from "@/components/share-qr";
import { BusinessPlanDialog } from "@/components/business-plan-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/businesses")({
  component: MyBusinessesPage,
});

type Row = {
  id: string; slug: string; name: string; type_slug: string; status: string;
  city: string | null; region: string | null;
  rating_avg: number; rating_count: number;
  price_label: string | null;
  subscription_tier: "free" | "listed" | "featured" | "premium" | null;
  logo_url: string | null;
  cover_url: string | null;
  featured_video_url: string | null;
  description: string | null;
  hours: unknown | null;
  phone: string | null;
  vanity_slug: string | null;
};

type Extras = {
  servicesCount: number;
  productsCount: number;
  photosCount: number;
  newInquiries: number;
};


function statusBadge(s: string) {
  if (s === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (s === "pending") return <Badge variant="secondary">Pending review</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (s === "archived") return <Badge variant="outline" className="border-amber-500/60 text-amber-600">Archived</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function PriceEditor({ row, onSaved }: { row: Row; onSaved: (val: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.price_label ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const next = value.trim() || null;
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ price_label: next, price_updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Price updated");
    onSaved(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setValue(row.price_label ?? ""); setEditing(true); }}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
      >
        <Tag className="h-3 w-3" />
        {row.price_label ? <span className="font-medium text-foreground">{row.price_label}</span> : "Add price / rate"}
        <Pencil className="h-3 w-3 opacity-60" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        placeholder="₱65/L, From ₱500…"
        className="h-7 w-40 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={save} disabled={saving}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function tierBadge(tier: Row["subscription_tier"]) {
  if (!tier || tier === "free") return null;
  const styles: Record<string, string> = {
    listed: "bg-slate-600",
    featured: "bg-primary",
    premium: "bg-amber-500 text-amber-950",
  };
  return <Badge className={styles[tier] ?? ""}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>;
}

type ChecklistItem = { key: string; label: string; tab: string; done: boolean };

function buildChecklist(b: Row, x: Extras): ChecklistItem[] {
  return [
    { key: "logo", label: "Logo", tab: "profile", done: !!b.logo_url },
    { key: "cover", label: "Cover image", tab: "profile", done: !!b.cover_url || !!b.featured_video_url },
    {
      key: "description",
      label: "Description (50+ chars)",
      tab: "profile",
      done: typeof b.description === "string" && b.description.trim().length >= 50,
    },
    { key: "phone", label: "Phone number", tab: "profile", done: !!b.phone },
    { key: "hours", label: "Opening hours", tab: "hours", done: !!b.hours },
    {
      key: "catalog",
      label: "Services or products",
      tab: "services",
      done: x.servicesCount + x.productsCount >= 1,
    },
    { key: "gallery", label: "3+ gallery photos", tab: "gallery", done: x.photosCount >= 3 },
    { key: "vanity", label: "Short URL", tab: "profile", done: !!b.vanity_slug },
  ];
}

function CompletenessChip({ b, x, onJump }: { b: Row; x: Extras; onJump: (tab: string) => void }) {
  const items = buildChecklist(b, x);
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const missing = items.filter((i) => !i.done);
  const [open, setOpen] = useState(false);

  const color =
    pct >= 100 ? "text-emerald-700 border-emerald-500/40 bg-emerald-500/10"
    : pct >= 70 ? "text-primary border-primary/40 bg-primary/10"
    : pct >= 40 ? "text-amber-700 border-amber-500/40 bg-amber-500/10"
    : "text-rose-700 border-rose-500/40 bg-rose-500/10";

  if (pct === 100) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${color}`}>
        <Sparkles className="h-3 w-3" /> Profile complete
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition hover:opacity-90 ${color}`}
      >
        <span className="inline-block h-1.5 w-10 overflow-hidden rounded-full bg-background/60">
          <span className="block h-full bg-current" style={{ width: `${pct}%` }} />
        </span>
        {pct}% complete · {missing.length} left
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border bg-popover p-2 shadow-md">
          <p className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground">Finish your profile</p>
          <ul className="space-y-0.5">
            {missing.map((it) => (
              <li key={it.key}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onJump(it.tab);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-accent"
                >
                  <span>{it.label}</span>
                  <span className="text-muted-foreground">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MyBusinessesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [extras, setExtras] = useState<Record<string, Extras>>({});
  const [loading, setLoading] = useState(true);
  const [planTarget, setPlanTarget] = useState<Row | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const setStatus = async (b: Row, nextStatus: "active" | "archived") => {
    const prevStatus = b.status;
    setRows((prev) => prev.map((r) => r.id === b.id ? { ...r, status: nextStatus } : r));
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ status: nextStatus })
      .eq("id", b.id);
    if (error) {
      setRows((prev) => prev.map((r) => r.id === b.id ? { ...r, status: prevStatus } : r));
      toast.error(error.message);
      return;
    }
    toast.success(nextStatus === "archived" ? "Business archived" : "Business restored");
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,slug,name,type_slug,status,city,region,rating_avg,rating_count,price_label,subscription_tier,logo_url,cover_url,featured_video_url,description,hours,phone,vanity_slug")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const list: Row[] = data ?? [];
      setRows(list);
      setLoading(false);

      const ids = list.map((r) => r.id);
      if (ids.length === 0) return;

      const [svc, prd, ph, inq] = await Promise.all([
        (supabase as any).from("business_services").select("business_id").in("business_id", ids),
        (supabase as any).from("business_products").select("business_id").in("business_id", ids),
        (supabase as any).from("business_gallery_photos").select("business_id").in("business_id", ids),
        (supabase as any).from("business_inquiries").select("business_id,status").in("business_id", ids),
      ]);

      const tally = (arr: any[] | null, predicate?: (r: any) => boolean): Record<string, number> => {
        const out: Record<string, number> = {};
        (arr ?? []).forEach((r) => {
          if (predicate && !predicate(r)) return;
          out[r.business_id] = (out[r.business_id] ?? 0) + 1;
        });
        return out;
      };

      const svcT = tally(svc.data);
      const prdT = tally(prd.data);
      const phT = tally(ph.data);
      const inqT = tally(inq.data, (r) => r.status === "new" || r.status === "pending");

      const next: Record<string, Extras> = {};
      ids.forEach((id) => {
        next[id] = {
          servicesCount: svcT[id] ?? 0,
          productsCount: prdT[id] ?? 0,
          photosCount: phT[id] ?? 0,
          newInquiries: inqT[id] ?? 0,
        };
      });
      setExtras(next);
    })();
  }, [user]);

  const archivedCount = rows.filter((r) => r.status === "archived").length;
  const visibleRows = showArchived ? rows : rows.filter((r) => r.status !== "archived");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">My businesses</h1>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button
              size="sm"
              variant={showArchived ? "secondary" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="mr-1 h-3.5 w-3.5" />
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </Button>
          )}
          <Button asChild size="sm"><Link to="/businesses/submit"><Plus className="mr-1 h-4 w-4" />Add business</Link></Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
          {rows.length === 0 ? "You haven't listed any business yet." : "No businesses to show."}
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((b) => {
            const x: Extras = extras[b.id] ?? { servicesCount: 0, productsCount: 0, photosCount: 0, newInquiries: 0 };
            return (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/businesses/$slug" params={{ slug: b.slug }} className="truncate font-semibold hover:underline">{b.name}</Link>
                  {statusBadge(b.status)}
                  {tierBadge(b.subscription_tier)}
                </div>
                <div className="text-xs text-muted-foreground">{[b.city, b.region].filter(Boolean).join(" · ")}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CompletenessChip
                    b={b}
                    x={x}
                    onJump={(tab) => {
                      window.location.href = `/dashboard/businesses/${b.id}/edit?tab=${tab}`;
                    }}
                  />
                  {x.newInquiries > 0 && (
                    <a
                      href={`/dashboard/businesses/${b.id}/edit?tab=inquiries`}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
                    >
                      <Inbox className="h-3 w-3" />
                      {x.newInquiries} new {x.newInquiries === 1 ? "inquiry" : "inquiries"}
                    </a>
                  )}
                  <PriceEditor
                    row={b}
                    onSaved={(val) => setRows((prev) => prev.map((r) => r.id === b.id ? { ...r, price_label: val } : r))}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.rating_count} review{b.rating_count === 1 ? "" : "s"}</span>
                <Button size="sm" asChild>
                  <Link to="/dashboard/businesses/$id/edit" params={{ id: b.id }}>
                    <LayoutTemplate className="mr-1 h-3.5 w-3.5" />
                    Manage page
                  </Link>
                </Button>
                {b.status === "active" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setPlanTarget(b)}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      {b.subscription_tier && b.subscription_tier !== "free" ? "Change plan" : "Upgrade"}
                    </Button>
                    <ShareQr
                      url={`${typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com"}/businesses/${b.slug}`}
                      title={b.name}
                      subtitle={[b.city, b.region].filter(Boolean).join(", ") || null}
                      fileSlug={b.slug}
                      compact
                    />
                  </>
                )}
                {b.status === "archived" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(b, "active")}>
                    <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Archive "${b.name}"?`,
                        description: `It will be immediately hidden from:\n• Public search results\n• The directory map\n• Direct shared links (/businesses/… and /b/…)\n\nWe'll email you a confirmation. You can restore it anytime from this page.`,
                        confirmText: "Archive",
                        destructive: true,
                      });
                      if (!ok) return;
                      setStatus(b, "archived");
                    }}
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archive
                  </Button>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {planTarget && (
        <BusinessPlanDialog
          open={!!planTarget}
          onOpenChange={(open) => !open && setPlanTarget(null)}
          businessId={planTarget.id}
          businessName={planTarget.name}
          typeSlug={planTarget.type_slug}
          currentTier={planTarget.subscription_tier ?? "free"}
        />
      )}
    </div>
  );
}
