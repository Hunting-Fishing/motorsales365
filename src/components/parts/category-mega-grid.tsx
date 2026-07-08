import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PARTS_CATEGORIES } from "@/data/parts-categories";

/**
 * Primary browse surface on /parts. Renders all curated parts categories as a
 * dense card grid — RockAuto/NAPA-style entry into the catalog.
 */
export function CategoryMegaGrid() {
  return (
    <section aria-labelledby="parts-categories-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="parts-categories-heading" className="font-display text-lg font-bold sm:text-xl">
            Shop by category
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Live partner inventory across every major system.
          </p>
        </div>
        <Link
          to="/parts/categories"
          className="hidden text-xs font-semibold text-primary hover:underline sm:inline"
        >
          View all →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        {PARTS_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              to="/parts/c/$slug"
              params={{ slug: c.slug }}
              className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl leading-none" aria-hidden>
                  {c.emoji}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground group-hover:text-primary">
                  {c.short}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                  {c.keywords.slice(0, 3).join(" · ")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
