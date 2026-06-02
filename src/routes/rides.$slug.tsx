import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MapPin, Pencil, Tag, Gauge, Settings, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { toggleRideLike } from "@/lib/rides.functions";
import { formatDate, formatPHP } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/rides/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any)
      .from("rides")
      .select("id,slug,name,year,make,model,trim,engine,cover_photo_url,description,user_id,status")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data || data.status !== "published") {
      // still allow owner; just return seo null
      return { seo: data ?? null };
    }
    return { seo: data };
  },
  head: ({ params, loaderData }) => {
    const d: any = loaderData?.seo;
    const url = `https://365motorsales.com/rides/${params.slug}`;
    if (!d) {
      return {
        meta: [{ title: "Ride — 365 MotorSales" }],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const vehicle = [d.year, d.make, d.model, d.trim].filter(Boolean).join(" ");
    const vehicleWithEngine = d.engine ? `${vehicle} • ${d.engine}` : vehicle;
    const title = `${d.name}${vehicleWithEngine ? ` — ${vehicleWithEngine}` : ""} | 365 MotorSales Rides`;
    const desc = (
      d.description ??
      `Photos, specs, mods and service history for ${vehicleWithEngine || d.name} on 365 MotorSales Philippines.`
    ).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(d.cover_photo_url
          ? [
              { property: "og:image", content: d.cover_photo_url },
              { name: "twitter:image", content: d.cover_photo_url },
            ]
          : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: RideProfilePage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Ride not found</h1>
        <Link to="/rides" className="mt-4 inline-block text-primary hover:underline">
          Browse all rides
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center text-destructive">
        {error.message}
      </div>
    </SiteLayout>
  ),
});

function RideProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [mods, setMods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logPhotos, setLogPhotos] = useState<Record<string, any[]>>({});
  const [ownership, setOwnership] = useState<any[]>([]);
  const [linkedListing, setLinkedListing] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const likeFn = useServerFn(toggleRideLike);

  const load = async () => {
    setLoading(true);
    const { data: r } = await (supabase as any)
      .from("rides")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!r) {
      setLoading(false);
      return;
    }
    setRide(r);
    setLikeCount(r.like_count ?? 0);
    const [{ data: p }, { data: m }, { data: l }, { data: o }, { data: prof }] = await Promise.all([
      (supabase as any).from("ride_photos").select("*").eq("ride_id", r.id).order("sort_order"),
      (supabase as any)
        .from("ride_mods")
        .select("*")
        .eq("ride_id", r.id)
        .order("category")
        .order("sort_order"),
      (supabase as any)
        .from("ride_service_log")
        .select("*")
        .eq("ride_id", r.id)
        .order("service_date", { ascending: false }),
      (supabase as any).from("ride_ownership").select("*").eq("ride_id", r.id).order("sort_order"),
      supabase
        .from("profiles")
        .select(
          "id,full_name,business_name,avatar_url,business_logo_url,seller_type,verification_status",
        )
        .eq("id", r.user_id)
        .maybeSingle(),
    ]);
    setPhotos(p ?? []);
    setMods(m ?? []);
    setLogs(l ?? []);
    setOwnership(o ?? []);
    setOwner(prof);
    const logIds = (l ?? []).map((x: any) => x.id);
    if (logIds.length) {
      const { data: lp } = await (supabase as any)
        .from("ride_service_log_photos")
        .select("*")
        .in("log_id", logIds)
        .order("sort_order");
      const grouped: Record<string, any[]> = {};
      for (const ph of lp ?? []) (grouped[ph.log_id] ||= []).push(ph);
      setLogPhotos(grouped);
    } else {
      setLogPhotos({});
    }
    if (r.linked_listing_id) {
      const { data: ll } = await supabase
        .from("listings")
        .select("id,title,price_php,status")
        .eq("id", r.linked_listing_id)
        .maybeSingle();
      setLinkedListing(ll);
    }
    if (user) {
      const { data: lk } = await (supabase as any)
        .from("ride_likes")
        .select("ride_id")
        .eq("ride_id", r.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(!!lk);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [slug, user?.id]);

  if (loading)
    return (
      <SiteLayout>
        <div className="p-12 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  if (!ride) throw notFound();

  const isOwner = user?.id === ride.user_id;
  const vehicle = [ride.year, ride.make, ride.model, ride.trim].filter(Boolean).join(" ");
  const ownerName = owner?.business_name || owner?.full_name || "Owner";
  const ownerLogo = owner?.business_logo_url || owner?.avatar_url;

  const handleLike = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));
    try {
      await likeFn({ data: { ride_id: ride.id } });
    } catch (e: any) {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
      toast.error(e.message);
    }
  };

  const specs: Array<[string, any]> = [
    ["Year", ride.year],
    ["Make", ride.make],
    ["Model", ride.model],
    ["Trim", ride.trim],
    ["Color", ride.color],
    ["Engine", ride.engine],
    ["Transmission", ride.transmission],
    ["Drivetrain", ride.drivetrain],
    ["Mileage", ride.mileage_km ? `${ride.mileage_km.toLocaleString()} km` : null],
    ["Type", ride.vehicle_type],
  ];
  const modsByCat = mods.reduce<Record<string, any[]>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  return (
    <SiteLayout>
      {/* Hero */}
      <div className="relative">
        <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden bg-secondary">
          {ride.cover_photo_url ? (
            <img
              src={ride.cover_photo_url}
              alt={ride.name}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
            <div className="container mx-auto">
              <div className="flex flex-wrap items-end justify-between gap-4 text-white">
                <div>
                  {ride.is_for_sale && (
                    <Badge className="mb-2 bg-primary">
                      <Tag className="mr-1 h-3 w-3" /> For sale
                    </Badge>
                  )}
                  <h1 className="font-display text-3xl font-bold drop-shadow sm:text-5xl">
                    {ride.name}
                  </h1>
                  {vehicle && <p className="mt-1 text-lg opacity-90">{vehicle}</p>}
                  {(ride.city || ride.region) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm opacity-80">
                      <MapPin className="h-3.5 w-3.5" />{" "}
                      {[ride.city, ride.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleLike}
                    variant={liked ? "default" : "outline"}
                    className="gap-1.5"
                  >
                    <Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} /> {likeCount}
                  </Button>
                  {isOwner && !(linkedListing && linkedListing.status !== "sold") && (
                    <Button asChild>
                      <Link to="/sell" search={{ from_ride: ride.id } as never}>
                        <Tag className="mr-1 h-4 w-4" /> List this ride for sale
                      </Link>
                    </Button>
                  )}
                  {isOwner && (
                    <Button asChild variant="outline">
                      <Link to="/dashboard/rides/$id/edit" params={{ id: ride.id }}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          {/* Description */}
          {ride.description && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">The story</h2>
              <p className="whitespace-pre-wrap text-foreground/90">{ride.description}</p>
            </section>
          )}

          {/* Linked listing */}
          {linkedListing && linkedListing.status !== "sold" && (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    For sale
                  </p>
                  <h3 className="font-display text-lg font-semibold">{linkedListing.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatPHP(linkedListing.price_php)}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/listing/$id" params={{ id: linkedListing.id }}>
                    View listing <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>
          )}
          {linkedListing && linkedListing.status === "sold" && (
            <Badge variant="secondary">Sold — previously listed as {linkedListing.title}</Badge>
          )}

          {/* Photo gallery */}
          {photos.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">Gallery</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={p.url}
                      alt={p.caption ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Specs */}
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5" /> Specifications
            </h2>
            <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-border/50 py-1.5 text-sm"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {/* Mods */}
          {mods.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" /> Modifications
              </h2>
              <div className="space-y-4">
                {Object.entries(modsByCat).map(([cat, items]) => (
                  <div key={cat} className="rounded-xl border border-border bg-card p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      {cat.replace(/_/g, " ")}
                    </h3>
                    <ul className="divide-y divide-border">
                      {items.map((m) => (
                        <li
                          key={m.id}
                          className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div>
                            <p className="font-medium">{m.part_name}</p>
                            {(m.brand || m.notes) && (
                              <p className="text-xs text-muted-foreground">
                                {[m.brand, m.notes].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {m.installed_on && <div>{formatDate(m.installed_on)}</div>}
                            {m.cost_php != null && <div>{formatPHP(m.cost_php)}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Service log timeline */}
          {logs.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">Service history</h2>
              <ol className="relative border-l-2 border-border pl-5">
                {logs.map((s) => (
                  <li key={s.id} className="mb-5 last:mb-0">
                    <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-medium">{s.service_type}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(s.service_date)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.mileage_km && <>at {s.mileage_km.toLocaleString()} km · </>}
                        {s.cost_php != null && formatPHP(s.cost_php)}
                      </div>
                      {s.notes && <p className="mt-2 text-sm">{s.notes}</p>}
                      {(() => {
                        const gallery = logPhotos[s.id] ?? [];
                        const legacy = s.photo_url
                          ? [{ id: `legacy-${s.id}`, url: s.photo_url }]
                          : [];
                        const all = [...gallery, ...legacy];
                        if (!all.length) return null;
                        return (
                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                            {all.map((ph: any) => (
                              <a
                                key={ph.id}
                                href={ph.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-md border border-border bg-muted"
                              >
                                <img
                                  src={ph.url}
                                  alt=""
                                  className="aspect-square h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Ownership */}
          {ownership.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">Ownership history</h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {ownership.map((o) => (
                  <li key={o.id} className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium">{o.owner_name}</p>
                      {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {o.acquired_on ? formatDate(o.acquired_on) : "?"} →{" "}
                      {o.sold_on ? formatDate(o.sold_on) : "present"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar — owner card */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Link
            to="/seller/$id"
            params={{ id: ride.user_id }}
            className="block rounded-xl border border-border bg-card p-4 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary">
                {ownerLogo ? (
                  <img src={ownerLogo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{ownerName.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owned by</p>
                <p className="font-semibold">{ownerName}</p>
              </div>
            </div>
          </Link>
        </aside>
      </div>
    </SiteLayout>
  );
}
