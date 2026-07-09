import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, Radio, Package } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  searchNetworkStock,
  type NetworkStockRow,
} from "@/lib/network-stock.functions";
import { NetworkPartInquiryDialog } from "@/components/parts/network-part-inquiry-dialog";

const TITLE = "Network parts stock — Live availability across 365 shops";
const DESCRIPTION =
  "Search live parts inventory across the 365 shop network in the Philippines. See which shop has it in stock, at what price, and request it in one click.";
const URL = "https://www.365motorsales.com/parts/network";

export const Route = createFileRoute("/parts/network")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: NetworkStockPage,
});

function NetworkStockPage() {
  const searchFn = useServerFn(searchNetworkStock);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [inquiry, setInquiry] = useState<NetworkStockRow | null>(null);

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["network-stock", submitted],
    queryFn: () => searchFn({ data: { query: submitted || undefined } }),
    staleTime: 15_000,
  });

  // Realtime: any change to network-visible inventory refetches the current search.
  useEffect(() => {
    const channel = supabase
      .channel("network-stock-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_inventory_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["network-stock"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <Badge variant="secondary" className="mb-3">
            <Radio className="mr-1 h-3 w-3" /> Live network stock
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Find parts in stock across the 365 network
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Search live inventory from 365 Franchise and Partner shops that opted in.
            Availability and quantities update in real time as shops sell and restock.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query.trim());
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Part name, SKU, or category (e.g. brake pad, oil filter, 04465-02220)"
                className="pl-9"
                aria-label="Search network stock"
              />
            </div>
            <Button type="submit" size="lg">
              Search stock
            </Button>
            <Button asChild type="button" size="lg" variant="outline">
              <Link to="/parts/my-requests">My requests</Link>
            </Button>
          </form>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8">
        {isFetching && rows.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading network stock…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">
              {submitted ? "No matching parts in the network yet." : "No listings yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              As shops opt in and stock parts, they'll appear here instantly.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/franchise">Join the network</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/parts">Browse parts catalog</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {rows.length} live listing{rows.length === 1 ? "" : "s"}
              {submitted ? ` for "${submitted}"` : ""}
            </p>
            {rows.map((r) => (
              <StockRow key={r.id} row={r} onInquire={setInquiry} />
            ))}
          </div>
        )}
      </section>

      <NetworkPartInquiryDialog
        row={inquiry}
        onClose={() => setInquiry(null)}
        onSubmitted={() => toast.success("Request sent to shop")}
      />
    </SiteLayout>
  );
}

function StockRow({
  row,
  onInquire,
}: {
  row: NetworkStockRow;
  onInquire: (r: NetworkStockRow) => void;
}) {
  const price = row.price != null ? `₱${Number(row.price).toLocaleString()}` : null;
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{row.name}</p>
          {row.sku && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              SKU {row.sku}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <Link
            to="/b/$slug"
            params={{ slug: row.business_slug }}
            className="hover:underline"
          >
            {row.business_name}
          </Link>
          {(row.city || row.province) && (
            <span className="ml-2 inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[row.city, row.province].filter(Boolean).join(", ")}
            </span>
          )}
          {row.category && <span className="ml-2">· {row.category}</span>}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{Number(row.qty_on_hand)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">
            {row.unit} in stock
          </p>
        </div>
        {price && (
          <div className="text-right">
            <p className="font-semibold">{price}</p>
            <p className="text-[10px] uppercase text-muted-foreground">per {row.unit}</p>
          </div>
        )}
        <Button size="sm" onClick={() => onInquire(row)}>
          Request
        </Button>
      </div>
    </Card>
  );
}
