import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Globe2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { listDocCheckCountries, type DocCheckCountry } from "@/lib/document-check.functions";

const TITLE = "Document Check — Global vehicle laws by country";
const DESC =
  "Vehicle transfer, import, export, and insurance rules by country. Buyer & seller reference for the 365 MotorSales network.";

export const Route = createFileRoute("/document-check/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://365motorsales.com/document-check" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/document-check" }],
  }),
  component: DocCheckHub,
});

function DocCheckHub() {
  const list = useServerFn(listDocCheckCountries);
  const { data } = useSuspenseQuery({
    queryKey: ["doc-check-countries"],
    queryFn: () => list(),
    staleTime: 5 * 60 * 1000,
  });

  const grouped = groupByRegion(data);

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/30">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe2 className="h-4 w-4" />
            Global reference
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Document Check by country
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every country has its own rules for buying, selling, importing, and insuring
            vehicles. Pick a country to see the transfer flow, required documents, and
            official government links.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        {grouped.map(([region, countries]) => (
          <section key={region} className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {region}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {countries.map((c) => (
                <Link
                  key={c.code}
                  to="/document-check/$country"
                  params={{ country: c.slug }}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-sm"
                >
                  <span className="text-3xl leading-none">{c.flag_emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold group-hover:text-primary">
                      {c.name}
                    </span>
                    {c.currency && (
                      <span className="block text-[11px] text-muted-foreground">
                        {c.currency} · drives {c.drives_on ?? "?"}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <p className="mt-6 text-xs text-muted-foreground">
          Content is compiled by the 365 MotorSales team and community contributors. Laws
          change — always confirm with the official agency for your country before signing
          any transfer.
        </p>
      </div>
    </SiteLayout>
  );
}

function groupByRegion(countries: DocCheckCountry[]): [string, DocCheckCountry[]][] {
  const map = new Map<string, DocCheckCountry[]>();
  for (const c of countries) {
    if (!map.has(c.region)) map.set(c.region, []);
    map.get(c.region)!.push(c);
  }
  return Array.from(map.entries());
}
