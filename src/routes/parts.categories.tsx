import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { PARTS_CATEGORIES } from "@/data/parts-categories";

export const Route = createFileRoute("/parts/categories")({
  head: () => ({
    meta: [
      { title: "Parts Categories — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Browse auto parts by category — brakes, engine, suspension, tires, electrical and more. Sourced from Shopee, Lazada and AliExpress partners.",
      },
      { property: "og:title", content: "Parts Categories — 365 Motor Sales" },
      {
        property: "og:description",
        content: "Shop auto parts by category from our Philippine partners.",
      },
      { property: "og:url", content: "https://www.365motorsales.com/parts/categories" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/parts/categories" }],
  }),
  component: CategoriesIndex,
});

function CategoriesIndex() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link
        to="/parts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Parts
      </Link>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Parts Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse by category. Each page shows live partner inventory from Shopee, Lazada and
          AliExpress alongside our own catalog.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARTS_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to="/parts/c/$slug"
            params={{ slug: c.slug }}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {c.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold group-hover:text-primary">{c.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
