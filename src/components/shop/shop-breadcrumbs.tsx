import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { slug: string; name: string; href?: string };

export function ShopBreadcrumbs({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <Link to="/shop" className="hover:text-foreground">
        Shop
      </Link>
      {trail.map((item, i) => {
        const last = i === trail.length - 1;
        // Department breadcrumbs use slug "department/<slug>"
        const isDept = item.slug.startsWith("department/");
        const deptSlug = isDept ? item.slug.slice("department/".length) : null;
        return (
          <span key={item.slug} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            {last ? (
              <span className="text-foreground">{item.name}</span>
            ) : isDept && deptSlug ? (
              <Link
                to="/shop/department/$slug"
                params={{ slug: deptSlug }}
                className="hover:text-foreground"
              >
                {item.name}
              </Link>
            ) : (
              <Link
                to="/shop/$category"
                params={{ category: item.slug }}
                className="hover:text-foreground"
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
