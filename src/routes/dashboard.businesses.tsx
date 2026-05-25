import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store as StoreIcon, Plus, Check, X, Pencil, Tag, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareQr } from "@/components/share-qr";
import { BusinessPlanDialog } from "@/components/business-plan-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/businesses")({
  component: MyBusinessesPage,
});

type Row = {
  id: string; slug: string; name: string; type_slug: string; status: string;
  city: string | null; region: string | null;
  rating_avg: number; rating_count: number;
  price_label: string | null;
  subscription_tier: "free" | "listed" | "featured" | "premium" | null;
};


function statusBadge(s: string) {
  if (s === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (s === "pending") return <Badge variant="secondary">Pending review</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
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

function MyBusinessesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [planTarget, setPlanTarget] = useState<Row | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id,slug,name,type_slug,status,city,region,rating_avg,rating_count,price_label,subscription_tier")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []); setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">My businesses</h1>
        <Button asChild size="sm"><Link to="/businesses/submit"><Plus className="mr-1 h-4 w-4" />Add business</Link></Button>
      </div>
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
          You haven't listed any business yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/businesses/$slug" params={{ slug: b.slug }} className="truncate font-semibold hover:underline">{b.name}</Link>
                  {statusBadge(b.status)}
                  {tierBadge(b.subscription_tier)}
                </div>
                <div className="text-xs text-muted-foreground">{[b.city, b.region].filter(Boolean).join(" · ")}</div>
                <div className="mt-2">
                  <PriceEditor
                    row={b}
                    onSaved={(val) => setRows((prev) => prev.map((r) => r.id === b.id ? { ...r, price_label: val } : r))}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.rating_count} review{b.rating_count === 1 ? "" : "s"}</span>
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
              </div>
            </Card>
          ))}
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

