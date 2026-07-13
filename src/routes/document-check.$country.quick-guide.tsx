import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { getDocCheckCountry } from "@/lib/document-check.functions";

export const Route = createFileRoute("/document-check/$country/quick-guide")({
  loader: async ({ params }) => {
    const result = await getDocCheckCountry({
      data: { code: params.country.toLowerCase() },
    });
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.country.name ?? params.country} — Quick Guide | 365 MotorSales`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickGuidePage,
  errorComponent: () => (
    <div className="p-10 text-center">Unavailable — please try again.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p>Guide not found.</p>
      <Link to="/document-check" className="text-primary underline">
        Back to countries
      </Link>
    </div>
  ),
});

function QuickGuidePage() {
  const { country, sections, documents } = Route.useLoaderData();
  const quick = sections.find((s) => s.kind === "quick_guide");
  const buying = sections.find((s) => s.kind === "buying");

  useEffect(() => {
    // Auto-open print dialog after initial render, but only client-side and once.
    if (typeof window !== "undefined") {
      const t = window.setTimeout(() => {
        try {
          window.print();
        } catch {
          /* ignore */
        }
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 18mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link to="/document-check/$country" params={{ country: country.slug }}>
            <Button variant="outline" size="sm">
              ← Back
            </Button>
          </Link>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        <div className="border-b border-black/10 pb-4">
          <div className="text-xs uppercase tracking-wide text-black/60">
            365 MotorSales · Document Check
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <span>{country.flag_emoji}</span>
            <span>{country.name} — Quick Guide</span>
          </h1>
          <p className="mt-1 text-sm text-black/70">
            {country.summary ??
              "Buyer & seller reference for vehicle transfer, insurance, and documents."}
          </p>
        </div>

        {quick && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">{quick.title}</h2>
            <div className="mt-2 [&_p]:text-black/80 [&_li]:text-black/80">
              <SimpleMarkdown source={quick.body_md} />
            </div>
          </section>
        )}

        {buying && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">{buying.title}</h2>
            <div className="mt-2 [&_p]:text-black/80 [&_li]:text-black/80">
              <SimpleMarkdown source={buying.body_md} />
            </div>
          </section>
        )}

        {documents.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">Documents you'll encounter</h2>
            <ul className="mt-2 space-y-3">
              {documents.map((d) => (
                <li key={d.id} className="border-l-2 border-black/20 pl-3">
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-xs text-black/60">
                    {[d.who_issues, d.typical_cost, d.validity].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-1 text-sm text-black/80">
                    <SimpleMarkdown source={d.description_md} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-[11px] text-black/50">
          Compiled by 365 MotorSales. Laws change — verify with the official agency before
          signing any transfer. 365motorsales.com/document-check/{country.slug}
        </p>
      </div>
    </div>
  );
}
