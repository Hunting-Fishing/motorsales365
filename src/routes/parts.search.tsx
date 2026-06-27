import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Wand2, Loader2, ShoppingCart } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AffiliateShopRow } from "@/components/parts/affiliate-shop-row";
import { decodeVin } from "@/lib/vin-decode.functions";

const TITLE = "Parts search by VIN or vehicle — 365 MotorSales";
const DESCRIPTION =
  "Find parts by VIN or year/make/model. We fan out to Shopee, Lazada, AliExpress, Amazon, and eBay so you get the best price.";
const URL = "https://www.365motorsales.com/parts/search";

export const Route = createFileRoute("/parts/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    vin: (s.vin as string) || undefined,
    mk: (s.mk as string) || undefined,
    md: (s.md as string) || undefined,
    yr: s.yr ? Number(s.yr) : undefined,
    q: (s.q as string) || undefined,
  }),
  head: ({ search }) => {
    const v = [search.yr, search.mk, search.md].filter(Boolean).join(" ").trim();
    const title = v ? `Parts for ${v} — 365 MotorSales` : TITLE;
    return {
      meta: [
        { title },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: title },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: URL },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: PartsSearchPage,
});

function PartsSearchPage() {
  const sp = Route.useSearch();
  const decode = useServerFn(decodeVin);

  const [vin, setVin] = useState(sp.vin ?? "");
  const [mk, setMk] = useState(sp.mk ?? "");
  const [md, setMd] = useState(sp.md ?? "");
  const [yr, setYr] = useState<string>(sp.yr ? String(sp.yr) : "");
  const [q, setQ] = useState(sp.q ?? "brake pads");
  const [decoding, setDecoding] = useState(false);
  const [decodeMsg, setDecodeMsg] = useState<string | null>(null);

  async function runDecode() {
    if (!vin.trim()) return;
    setDecoding(true);
    setDecodeMsg(null);
    try {
      const res: any = await decode({ data: { value: vin.trim() } });
      if (res.ok) {
        setMk(res.make ?? "");
        setMd(res.model ?? "");
        setYr(res.year ? String(res.year) : "");
        setDecodeMsg(`✓ ${res.year ?? ""} ${res.make} ${res.model}`.trim());
      } else {
        setDecodeMsg(`✗ ${res.reason}`);
      }
    } catch (e: any) {
      setDecodeMsg(`✗ ${e?.message ?? "decode failed"}`);
    } finally {
      setDecoding(false);
    }
  }

  const searchQuery = useMemo(() => {
    const v = [yr, mk, md].filter(Boolean).join(" ").trim();
    return [v, q.trim()].filter(Boolean).join(" ").trim() || q.trim() || "auto parts";
  }, [yr, mk, md, q]);

  // Auto-decode once if a vin was passed in the URL.
  useEffect(() => {
    if (sp.vin && !mk && !md) void runDecode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Parts search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your VIN or chassis code — or just pick year/make/model — and we'll fan out to every
          partner store. Affiliate commissions help keep 365 free.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="vin" className="text-xs font-medium">VIN or chassis code</Label>
              <Input
                id="vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="e.g. 1HGCM82633A004352  or  JZX100"
                className="mt-1 uppercase"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={runDecode} disabled={decoding || !vin.trim()} className="w-full sm:w-auto">
                {decoding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Decode
              </Button>
            </div>
          </div>
          {decodeMsg && <p className="mt-2 text-xs text-muted-foreground">{decodeMsg}</p>}

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or pick manually <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="yr" className="text-xs font-medium">Year</Label>
              <Input id="yr" inputMode="numeric" value={yr} onChange={(e) => setYr(e.target.value)} placeholder="2018" />
            </div>
            <div>
              <Label htmlFor="mk" className="text-xs font-medium">Make</Label>
              <Input id="mk" value={mk} onChange={(e) => setMk(e.target.value)} placeholder="Toyota" />
            </div>
            <div>
              <Label htmlFor="md" className="text-xs font-medium">Model</Label>
              <Input id="md" value={md} onChange={(e) => setMd(e.target.value)} placeholder="Vios" />
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor="q" className="text-xs font-medium">Part keywords</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="brake pads, headlight, oil filter…"
              />
              <Button variant="default">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Results for <span className="rounded bg-primary/10 px-1.5 text-primary">{searchQuery}</span>
          </div>
          <AffiliateShopRow
            query={searchQuery}
            make={mk || null}
            model={md || null}
            year={yr ? Number(yr) : null}
            title="Shop these parts across all partner stores"
          />
          <p className="mt-3 text-[11px] text-muted-foreground">
            We may earn a commission from purchases made through these links. Prices and availability
            are set by each store.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
