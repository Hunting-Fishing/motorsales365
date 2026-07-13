import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ExternalLink, Printer, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleMarkdown } from "@/components/simple-markdown";
import {
  getDocCheckCountry,
  type DocCheckSection,
} from "@/lib/document-check.functions";

const SECTION_ORDER: DocCheckSection["kind"][] = [
  "quick_guide",
  "buying",
  "selling",
  "import",
  "export",
  "insurance",
  "documents",
];

const SECTION_LABEL: Record<DocCheckSection["kind"], string> = {
  quick_guide: "Quick Guide",
  buying: "Buying & Transfer",
  selling: "Selling",
  import: "Import",
  export: "Export",
  insurance: "Insurance",
  documents: "Documents",
};

export const Route = createFileRoute("/document-check/$country")({
  loader: async ({ params }) => {
    const result = await getDocCheckCountry({ data: { code: params.country.toLowerCase() } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.country.name ?? params.country;
    const title = `${name} vehicle laws — Document Check | 365 MotorSales`;
    const desc =
      loaderData?.country.summary ??
      `Vehicle transfer, import, export, insurance, and document requirements for ${name}.`;
    const url = `https://365motorsales.com/document-check/${params.country}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CountryPage,
  errorComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          Try again shortly or return to the{" "}
          <Link to="/document-check" className="text-primary underline">
            country list
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Country not found</h1>
        <p className="mt-2 text-muted-foreground">
          We don't have a Document Check page for that country yet.{" "}
          <Link to="/document-check" className="text-primary underline">
            Browse all countries
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  ),
});

function CountryPage() {
  const { country, sections, documents, links } = Route.useLoaderData();
  const router = useRouter();

  const bySection = new Map<string, DocCheckSection[]>();
  for (const s of sections) {
    if (!bySection.has(s.kind)) bySection.set(s.kind, []);
    bySection.get(s.kind)!.push(s);
  }
  const availableKinds = SECTION_ORDER.filter((k) => bySection.has(k) || k === "documents");

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/30">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/document-check" className="hover:text-foreground">
              Document Check
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{country.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-5xl leading-none">{country.flag_emoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {country.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {country.region}
                {country.currency ? ` · ${country.currency}` : ""}
                {country.drives_on ? ` · drives on the ${country.drives_on}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/document-check">
                  <ArrowLeft className="h-4 w-4" /> All countries
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.navigate({
                    to: "/document-check/$country/quick-guide",
                    params: { country: country.slug },
                  });
                }}
              >
                <Printer className="h-4 w-4" /> Printable guide
              </Button>
            </div>
          </div>
          {country.summary && (
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{country.summary}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue={availableKinds[0] ?? "quick_guide"}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {availableKinds.map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="rounded-full border border-border data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {SECTION_LABEL[k]}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableKinds.map((kind) => (
            <TabsContent key={kind} value={kind} className="mt-6">
              {kind === "documents" ? (
                <DocumentsPanel documents={documents} />
              ) : (
                <div className="space-y-6">
                  {(bySection.get(kind) ?? []).map((s) => (
                    <Card key={s.id}>
                      <CardHeader>
                        <CardTitle className="text-xl">{s.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SimpleMarkdown source={s.body_md} />
                      </CardContent>
                    </Card>
                  ))}
                  <SectionLinks kind={kind} links={links} />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-10 rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          This page is a plain-language reference compiled by 365 MotorSales. Vehicle laws
          change frequently — always confirm current requirements with the country's
          official agencies before signing any transfer or shipping paperwork.
        </div>
      </div>
    </SiteLayout>
  );
}

function DocumentsPanel({
  documents,
}: {
  documents: ReturnType<typeof Route.useLoaderData>["documents"];
}) {
  if (!documents.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Document reference for this country is being compiled.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {documents.map((d) => (
        <Card key={d.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.name}</CardTitle>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {d.code}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <SimpleMarkdown source={d.description_md} />
            <dl className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              {d.who_issues && (
                <div>
                  <dt className="uppercase tracking-wide">Issued by</dt>
                  <dd className="text-foreground">{d.who_issues}</dd>
                </div>
              )}
              {d.typical_cost && (
                <div>
                  <dt className="uppercase tracking-wide">Cost</dt>
                  <dd className="text-foreground">{d.typical_cost}</dd>
                </div>
              )}
              {d.validity && (
                <div>
                  <dt className="uppercase tracking-wide">Validity</dt>
                  <dd className="text-foreground">{d.validity}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionLinks({
  kind,
  links,
}: {
  kind: string;
  links: ReturnType<typeof Route.useLoaderData>["links"];
}) {
  const relevant = links.filter(
    (l) => l.section_kind === kind || l.section_kind === null,
  );
  if (!relevant.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Official agency links</h3>
      <ul className="space-y-1 text-sm">
        {relevant.map((l) => (
          <li key={l.id}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {l.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
