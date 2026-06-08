import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, MapPin, Clock, MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPHP, formatDate, PH_REGIONS } from "@/lib/format";

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "car", label: "Cars" },
  { value: "motorcycle", label: "Motorcycles" },
  { value: "truck", label: "Trucks" },
  { value: "equipment", label: "Equipment" },
  { value: "part", label: "Parts" },
  { value: "service", label: "Services" },
  { value: "tow", label: "Towing" },
  { value: "other", label: "Other" },
] as const;

export const Route = createFileRoute("/wanted/")({
  component: WantedIndex,
  head: () => ({
    meta: [
      { title: "Wanted — Buyer requests on 365 Motor Sales" },
      {
        name: "description",
        content:
          "Browse buyer-side 'Wanted' posts across the Philippines — cars, motorcycles, parts, services and towing. Sellers and shops can respond directly.",
      },
      { property: "og:title", content: "Wanted — Buyer requests on 365 Motor Sales" },
      {
        property: "og:description",
        content:
          "What Filipino buyers are looking for right now. Post what you need or respond as a seller.",
      },
    ],
  }),
});

type WantedRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min_php: number | null;
  budget_max_php: number | null;
  region: string | null;
  city: string | null;
  response_count: number;
  created_at: string;
  expires_at: string;
};

function WantedIndex() {
  const [rows, setRows] = useState<WantedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = (supabase as any)
        .from("wanted_posts")
        .select(
          "id, title, description, category, budget_min_php, budget_max_php, region, city, response_count, created_at, expires_at",
        )
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      if (category !== "all") q = q.eq("category", category);
      if (region !== "all") q = q.eq("region", region);
      const { data } = await q;
      setRows((data ?? []) as WantedRow[]);
      setLoading(false);
    })();
  }, [category, region]);

  const heroCopy = useMemo(
    () =>
      "Tell the Philippine motoring community what you need — sellers, dealers, shops and tow operators can respond directly.",
    [],
  );

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero / always-rendered SSR-friendly content */}
        <header className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Megaphone className="h-3.5 w-3.5" /> Buyer requests
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Wanted board</h1>
              <p className="mt-2 text-muted-foreground">{heroCopy}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/wanted/new">
                    <Plus className="mr-1 h-4 w-4" /> Post what you need
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/start-selling">I'm a seller — how it works</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:max-w-xs">
              <li>• "Looking for Toyota Vios under ₱300k in Ilocos"</li>
              <li>• "Need 4D56 used engine, Cebu"</li>
              <li>• "Tow Laoag → Manila next Tuesday"</li>
              <li>• "Pre-purchase inspection mechanic, Davao"</li>
            </ul>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="w-48">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {PH_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            Loading wanted posts…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-medium">No open wanted posts match your filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to tell the community what you're looking for.
            </p>
            <Button asChild className="mt-4">
              <Link to="/wanted/new">Post a wanted request</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/wanted/$id"
                  params={{ id: r.id }}
                  className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold">{r.title}</h2>
                    <Badge variant="outline" className="capitalize">
                      {r.category}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(r.budget_min_php || r.budget_max_php) && (
                      <span>
                        Budget:{" "}
                        {r.budget_min_php ? formatPHP(r.budget_min_php) : "any"}
                        {" – "}
                        {r.budget_max_php ? formatPHP(r.budget_max_php) : "any"}
                      </span>
                    )}
                    {(r.region || r.city) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[r.city, r.region].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Posted {formatDate(r.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {r.response_count} {r.response_count === 1 ? "response" : "responses"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
