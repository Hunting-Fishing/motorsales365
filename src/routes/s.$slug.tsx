import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Globe, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/s/$slug")({
  component: ShowroomPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Showroom · 365 Motor Sales` },
      {
        name: "description",
        content: "Premium dealer showroom on 365 Motor Sales.",
      },
      { property: "og:title", content: `${params.slug} — Showroom` },
    ],
  }),
});

function ShowroomPage() {
  const { slug } = Route.useParams();
  const [business, setBusiness] = useState<any | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: biz } = await (supabase as any)
        .from("businesses")
        .select(
          "id, name, slug, vanity_slug, description, cover_url, logo_url, theme_color, subscription_tier, region, city, address, phone, website, type_slug",
        )
        .or(`vanity_slug.eq.${slug},slug.eq.${slug}`)
        .eq("status", "active")
        .in("subscription_tier", ["featured", "premium"])
        .maybeSingle();

      if (!biz) {
        setNotFoundState(true);
        setLoading(false);
        return;
      }
      setBusiness(biz);

      const { data: l } = await supabase
        .from("listings")
        .select("id, title, price_php, hero_image_url, city, region, slug")
        .eq("user_id", (biz as any).owner_id ?? "00000000-0000-0000-0000-000000000000")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      setListings(l ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="p-12 text-center text-muted-foreground">Loading showroom…</div>
      </SiteLayout>
    );
  }

  if (notFoundState || !business) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Showroom not found</h1>
          <p className="text-muted-foreground">
            This showroom isn't available. Premium business plans get a custom showroom page.
          </p>
          <Button asChild className="mt-4">
            <Link to="/businesses">Browse businesses</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const theme = business.theme_color || "#0ea5e9";

  return (
    <SiteLayout>
      <div
        className="relative h-64 md:h-80 w-full bg-cover bg-center"
        style={{
          backgroundImage: business.cover_url ? `url(${business.cover_url})` : undefined,
          backgroundColor: theme,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-6 flex items-end gap-4">
          {business.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              className="h-20 w-20 rounded-xl border-4 border-background bg-card object-cover"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge style={{ backgroundColor: theme, color: "white" }}>
                <Sparkles className="h-3 w-3 mr-1" />
                {business.subscription_tier === "premium" ? "Premium showroom" : "Featured showroom"}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-sm">{business.name}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        <aside className="space-y-4">
          {business.description && (
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> About
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {business.description}
              </p>
            </div>
          )}
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            {(business.address || business.city || business.region) && (
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>
                  {[business.address, business.city, business.region].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {business.phone && (
              <div className="flex gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={`tel:${business.phone}`} className="hover:underline">{business.phone}</a>
              </div>
            )}
            {business.website && (
              <div className="flex gap-2">
                <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={business.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                  {business.website}
                </a>
              </div>
            )}
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/businesses/$slug" params={{ slug: business.slug }}>
              View full business page
            </Link>
          </Button>
        </aside>

        <section className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Current inventory</h2>
          {listings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No active listings right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {l.hero_image_url && (
                    <img
                      src={l.hero_image_url}
                      alt={l.title}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-3">
                    <div className="font-medium text-sm line-clamp-1">{l.title}</div>
                    <div className="text-sm font-bold mt-1" style={{ color: theme }}>
                      ₱{Number(l.price_php).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
