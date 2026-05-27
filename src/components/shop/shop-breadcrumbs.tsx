import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { slug: string; name: string; href?: string };

export function ShopBreadcrumbs({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link to="/shop" className="hover:text-foreground">Shop</Link>
      {trail.map((item, i) => (
        <span key={item.slug} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          {i === trail.length - 1 ? (
            <span className="text-foreground">{item.name}</span>
          ) : (
            <Link to="/shop/$category" params={{ category: item.slug }} className="hover:text-foreground">
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
