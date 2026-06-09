import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/route-boundaries";
import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Star,
  Store as StoreIcon,
  Clock,
  ShoppingBag,
  Sparkles,
  CalendarDays,
  Info,
  Award,
} from "lucide-react";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PressableTooltip } from "@/components/ui/pressable-tooltip";
import { waMeUrl } from "@/lib/whatsapp";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { GoogleBusinessMap } from "@/components/businesses/google-business-map";
import { SuggestLocationDialog } from "@/components/businesses/suggest-location-dialog";
import { ShareQr } from "@/components/share-qr";
import { InquiryForm } from "@/components/business-page/inquiry-form";
import { getBusinessPage } from "@/lib/business-pages.functions";
import { listOwnerCertificates } from "@/lib/education.functions";
import {
  PublicGallerySection,
  PublicContactSection,
  FeaturedVideoEmbed,
} from "@/components/business-page/public-sections";
import { ShareButtons } from "@/components/business-page/share-buttons";
import { ClaimCta } from "@/components/business-page/claim-cta";
import { ClaimStatusSection } from "@/components/business-page/claim-status-section";
import { ClaimHistoryTimeline } from "@/components/business-page/claim-history-timeline";
import { useTrackBusinessEvent, useTrackPageView } from "@/lib/use-track-business-event";
import { siteOrigin } from "@/lib/site-config";
import {
  isStructuredHours,
  getStatus,
  legacyToRows,
  formatRange,
  DAY_KEYS,
  DAY_LABELS,
  type StructuredHours,
  type HoursStatus,
} from "@/lib/business-hours";

export const Route = createFileRoute("/businesses/$slug")({
  loader: async ({ params }) => {
    try {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("name,description,tagline,city,region,logo_url,cover_url")
        .eq("slug", params.slug)
        .eq("status", "active")
        .maybeSingle();
      return { seo: data ?? null };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const b: any = loaderData?.seo;
    const url = `https://www.365motorsales.com/businesses/${params.slug}`;
    if (!b) {
      return {
        meta: [
          { title: "Business — 365 MotorSales Philippines" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const loc = [b.city, b.region].filter(Boolean).join(", ");
    const title = `${b.name}${loc ? ` — ${loc}` : ""} | 365 MotorSales`;
    const desc = (
      b.tagline ||
      b.description ||
      `${b.name}${loc ? ` in ${loc}` : ""} — automotive business on 365 MotorSales Philippines.`
    ).slice(0, 155);
    const img = b.cover_url ?? b.logo_url ?? null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: b.name,
            description: b.tagline || b.description || undefined,
            image: img || undefined,
            address: loc || undefined,
            url,
          }),
        },
      ],
    };
  },
  component: BusinessProfilePage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary message="Business not found." />,
});

function peso(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function BusinessProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const fetchPage = useServerFn(getBusinessPage);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["business-page", slug],
    queryFn: () => fetchPage({ data: { slug } }),
  });
  const ownerId = (data?.business as any)?.owner_id ?? null;
  const { data: certData } = useQuery({
    queryKey: ["business-owner-certs", ownerId],
    queryFn: () => listOwnerCertificates({ data: { ownerId } }),
    enabled: Boolean(ownerId),
  });

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasMapState, setHasMapState] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setHasMapState(!!window.localStorage.getItem("map:last-search"));
    } catch {
      setHasMapState(false);
    }
  }, []);

  useTrackPageView(data?.business?.id ?? null);
  const track = useTrackBusinessEvent(data?.business?.id ?? null);

  if (isLoading)
    return (
      <SiteLayout>
        <div className="container mx-auto p-8">Loading…</div>
      </SiteLayout>
    );

  const biz: any = data?.business;
  if (!biz) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Business not found</h1>
          <Link to="/businesses" className="mt-4 inline-block text-primary underline">
            Back to directory
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const typeLabel = data?.typeLabel ?? "";
  const tagLabels = data?.tagLabels ?? [];
  const services = data?.services ?? [];
  const products = data?.products ?? [];
  const posts = data?.posts ?? [];
  const reviews = data?.reviews ?? [];
  const reviewerNames = data?.reviewerNames ?? {};
  const albums = (data as any)?.albums ?? [];
  const photos = (data as any)?.photos ?? [];
  const contactChannels = (data as any)?.contactChannels ?? [];

  const ownerCertificates: any[] = (certData?.certificates as any[]) ?? [];

  const myReview = reviews.find((r: any) => r.user_id === user?.id);
  const location = [biz.barangay, biz.city, biz.province, biz.region].filter(Boolean).join(", ");
  const accent = biz.theme_color || null;
  const accentStyle = accent
    ? ({ ["--vendor-accent" as any]: accent } as React.CSSProperties)
    : undefined;

  const submitReview = async () => {
    if (!user) {
      toast.error("Please sign in to leave a review");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("business_reviews")
      .upsert(
        { business_id: biz.id, user_id: user.id, rating, body: body.trim() || null },
        { onConflict: "business_id,user_id" },
      );
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks for your review!");
    setBody("");
    refetch();
  };

  const messengerHref = biz.messenger_url || null;
  const telHref = biz.phone ? `tel:${biz.phone}` : null;
  const whatsappHref = waMeUrl(
    biz.phone,
    `Hi ${biz.name}, I found you on 365 Motor Sales and would like to ask about your services.`,
  );

  return (
    <SiteLayout>
      <div style={accentStyle}>
        {hasMapState && (
          <div className="container mx-auto px-4 pt-3">
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-muted"
            >
              <MapPin className="h-3.5 w-3.5" />← Back to map
            </Link>
          </div>
        )}
        {/* HERO */}
        <div className="relative">
          {biz.featured_video_url ? (
            <div className="container mx-auto px-4 pt-4">
              <FeaturedVideoEmbed
                url={biz.featured_video_url}
                provider={biz.featured_video_provider ?? null}
              />
            </div>
          ) : (
            <div
              className="h-48 w-full bg-muted md:h-72 lg:h-80"
              style={{
                backgroundImage: biz.cover_url ? `url(${biz.cover_url})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="h-full w-full bg-gradient-to-b from-black/10 via-black/30 to-background" />
            </div>
          )}

          <div
            className={`container mx-auto px-4 ${biz.featured_video_url ? "mt-4" : "-mt-16 md:-mt-20"}`}
          >
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start gap-4 p-5">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg md:h-28 md:w-28"
                  style={accent ? { borderColor: accent } : undefined}
                >
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover" />
                  ) : (
                    <StoreIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-bold md:text-3xl">{biz.name}</h1>
                    {biz.subscription_tier === "premium" && (
                      <Badge className="bg-amber-500 text-amber-950">Premium</Badge>
                    )}
                    {biz.subscription_tier === "featured" && (
                      <Badge className="bg-primary">Featured</Badge>
                    )}
                    {biz.subscription_tier === "listed" && (
                      <Badge variant="secondary">Listed</Badge>
                    )}
                    {biz.claim_state === "unclaimed" && (
                      <Badge
                        variant="outline"
                        className="border-dashed text-muted-foreground"
                        title="This listing was added from public sources and has not been claimed by the owner yet."
                      >
                        Unclaimed
                      </Badge>
                    )}
                    {biz.claim_state === "claim_pending" && (
                      <Badge variant="outline" className="border-dashed">
                        Claim pending
                      </Badge>
                    )}
                    {biz.price_label && (
                      <Badge variant="secondary" className="font-semibold">
                        {biz.price_label}
                      </Badge>
                    )}
                  </div>
                  {typeLabel && <div className="text-sm text-muted-foreground">{typeLabel}</div>}
                  {biz.tagline && (
                    <p className="mt-1 text-sm md:text-base text-foreground/80">{biz.tagline}</p>
                  )}
                  {biz.rating_count > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{Number(biz.rating_avg).toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({biz.rating_count} review{biz.rating_count === 1 ? "" : "s"})
                      </span>
                    </div>
                  )}
                  {location && (
                    <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {biz.street_address ? `${biz.street_address}, ` : ""}
                        {location}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {telHref && (
                      <Button
                        size="sm"
                        asChild
                        style={accent ? { backgroundColor: accent } : undefined}
                        onClick={() => track("call_click")}
                      >
                        <a href={telHref}>
                          <Phone className="mr-1 h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    )}
                    {whatsappHref && (
                      <Button
                        size="sm"
                        asChild
                        className="bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                        onClick={() => track("whatsapp_click")}
                      >
                        <a href={whatsappHref} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-1 h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {messengerHref && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        onClick={() => track("messenger_click")}
                      >
                        <a href={messengerHref} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-1 h-4 w-4" />
                          Messenger
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href="#inquiry">
                        <Mail className="mr-1 h-4 w-4" />
                        Get a quote
                      </a>
                    </Button>
                    {biz.website && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        onClick={() => track("website_click")}
                      >
                        <a href={biz.website} target="_blank" rel="noreferrer">
                          <Globe className="mr-1 h-4 w-4" />
                          Website
                        </a>
                      </Button>
                    )}
                    <ShareButtons
                      url={`${siteOrigin()}/businesses/${biz.slug}`}
                      title={biz.name}
                      onShare={(target) => track("share_click", { target })}
                    />
                    <ShareQr
                      url={`${siteOrigin()}/businesses/${biz.slug}`}
                      title={biz.name}
                      subtitle={location || null}
                      coverUrl={biz.cover_url || biz.logo_url || null}
                      accent={typeLabel || null}
                      fileSlug={biz.slug}
                      triggerLabel="QR & Poster"
                    />
                  </div>

                  {(data?.tags?.length ?? 0) > 0 ? (
                    <TagGroups
                      tags={data!.tags as any}
                      primaryTypeSlug={(data as any)?.primaryTypeSlug ?? null}
                      typeLabels={(data as any)?.typeLabels ?? {}}
                    />
                  ) : tagLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tagLabels.map((l: string) => (
                        <Badge key={l} variant="secondary">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            {/* Legend */}
            {(data?.tags?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-md border border-border/70 bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  About these services
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px]">
                      Example
                    </Badge>
                    <span>
                      Services this business offers as part of its primary category (e.g., tire repair at a tire shop).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 bg-accent/40 text-[10px]">
                      Example
                    </Badge>
                    <span>
                      Services offered outside the main category — labeled “Also offered” with the matching business type.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 md:py-10 space-y-6">
          {biz.claim_state && biz.claim_state !== "owned" && (
            <ClaimCta
              businessId={biz.id}
              businessName={biz.name}
              claimState={biz.claim_state}
            />
          )}
          <ClaimStatusSection businessId={biz.id} />
          <ClaimHistoryTimeline businessId={biz.id} />
          {/* ABOUT + HOURS + MAP */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-2 font-display text-lg font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {biz.description || "No description provided."}
              </p>
              {biz.brands_carried && (
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Brands carried
                  </div>
                  <div className="mt-1 text-sm">{biz.brands_carried}</div>
                </div>
              )}
              {biz.hours && (
                <div className="mt-4">
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <Clock className="h-4 w-4" />
                    Hours
                  </h3>
                  <BusinessHoursBlock
                    hours={biz.hours}
                    isFuelStation={biz.type_slug === "fuel_station"}
                  />
                </div>
              )}
            </Card>
            <div>
              <GoogleBusinessMap
                height={420}
                center={biz.lat && biz.lng ? { lat: Number(biz.lat), lng: Number(biz.lng) } : null}
                businesses={
                  biz.lat && biz.lng
                    ? [
                        {
                          id: biz.id,
                          slug: biz.slug,
                          name: biz.name,
                          type_slug: biz.type_slug,
                          type_label: typeLabel,
                          lat: Number(biz.lat),
                          lng: Number(biz.lng),
                          rating_avg: Number(biz.rating_avg),
                          rating_count: biz.rating_count,
                          city: biz.city,
                          featured: biz.featured,
                          price_label: biz.price_label,
                        },
                      ]
                    : []
                }
              />
              {biz.lat && biz.lng && (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Pin in the wrong spot?</span>
                  <SuggestLocationDialog
                    businessId={biz.id}
                    businessName={biz.name}
                    currentLat={Number(biz.lat)}
                    currentLng={Number(biz.lng)}
                    region={biz.region ?? null}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SERVICES */}
          {biz.show_services !== false && services.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={accent ? { color: accent } : undefined} />
                <h2 className="font-display text-lg font-semibold">Services</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s: any) => (
                  <div key={s.id} className="flex gap-3 rounded-lg border border-border p-3">
                    {s.photo_url && (
                      <img
                        src={s.photo_url}
                        alt={s.title ? `${s.title} service photo` : "Service photo"}
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{s.title}</div>
                        {s.price_label && (
                          <Badge variant="secondary" className="shrink-0 font-semibold">
                            {s.price_label}
                          </Badge>
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* PRODUCTS */}
          {biz.show_products !== false && products.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" style={accent ? { color: accent } : undefined} />
                <h2 className="font-display text-lg font-semibold">Shop</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p: any) => {
                  const onSale =
                    p.sale_price_php != null &&
                    p.price_php != null &&
                    Number(p.sale_price_php) < Number(p.price_php);
                  return (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-border">
                      <div className="aspect-square w-full bg-muted">
                        {p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
                        <div className="mt-1 flex items-center gap-2">
                          {onSale ? (
                            <>
                              <span
                                className="text-sm font-bold"
                                style={accent ? { color: accent } : undefined}
                              >
                                {peso(Number(p.sale_price_php))}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {peso(Number(p.price_php))}
                              </span>
                            </>
                          ) : p.price_php != null ? (
                            <span className="text-sm font-bold">{peso(Number(p.price_php))}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Message for price</span>
                          )}
                        </div>
                        {!p.in_stock && (
                          <div className="mt-1 text-xs text-destructive">Out of stock</div>
                        )}
                        <Button size="sm" variant="outline" className="mt-2 w-full text-xs" asChild>
                          <a
                            href={messengerHref || telHref || "#inquiry"}
                            target={messengerHref ? "_blank" : undefined}
                            rel="noreferrer"
                          >
                            {messengerHref
                              ? "Message to order"
                              : telHref
                                ? "Call to order"
                                : "Inquire"}
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* POSTS */}
          {biz.show_posts !== false && posts.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-5 w-5" style={accent ? { color: accent } : undefined} />
                <h2 className="font-display text-lg font-semibold">Updates</h2>
              </div>
              <div className="space-y-3">
                {posts.map((p: any) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
                    {p.photo_url && (
                      <img
                        src={p.photo_url}
                        alt={`${biz.name ?? "Business"} update photo`}
                        className="mt-2 max-h-72 rounded-md object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* GALLERY */}
          {biz.show_gallery !== false && albums.length > 0 && (
            <PublicGallerySection
              albums={albums}
              photos={photos}
              accent={accent}
              onAlbumOpen={(albumId) => track("gallery_view", { album_id: albumId })}
            />
          )}

          {/* CONTACT CHANNELS */}
          {biz.show_contact !== false && contactChannels.length > 0 && (
            <PublicContactSection channels={contactChannels} accent={accent} />
          )}

          {/* BOOKINGS CTA */}
          {Array.isArray((data as any)?.bookableItems) &&
            (data as any).bookableItems.length > 0 && (
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold">Book an appointment</h2>
                    <p className="text-sm text-muted-foreground">
                      Pick a time that works for you — {(data as any).bookableItems.length} bookable
                      service{(data as any).bookableItems.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                  <Link
                    to="/businesses/$slug/book"
                    params={{ slug }}
                    onClick={() => track("book_click")}
                  >
                    <Button style={{ backgroundColor: accent || undefined }}>Book now</Button>
                  </Link>
                </div>
              </Card>
            )}

          {/* INQUIRY */}
          <Card id="inquiry" className="p-5">
            <h2 className="mb-1 font-display text-lg font-semibold">Send a message</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask {biz.name} a question or request a quote. They'll get back to you directly.
            </p>
            <InquiryForm businessId={biz.id} businessName={biz.name} />
          </Card>

          {/* REVIEWS */}
          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Reviews</h2>
            {user ? (
              <div className="mb-6 rounded-lg border border-border p-4">
                <div className="mb-2 text-sm font-medium">
                  {myReview ? "Update your review" : "Leave a review"}
                </div>
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`Rate ${n}`}
                    >
                      <Star
                        className={`h-6 w-6 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your experience…"
                  rows={3}
                  maxLength={1000}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={submitReview} disabled={submitting}>
                    {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <Link to="/login" className="text-primary underline">
                  Sign in
                </Link>{" "}
                to leave a review.
              </div>
            )}
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-border p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {reviewerNames[r.user_id] ?? "User"}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            {hasMapState && (
              <Link to="/map" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to map
              </Link>
            )}
            <Link to="/businesses" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to directory
            </Link>
          </div>
        </div>

        {/* Sticky mobile CTA bar */}
        {(telHref ||
          whatsappHref ||
          (Array.isArray((data as any)?.bookableItems) &&
            (data as any).bookableItems.length > 0)) && (
          <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-3 py-2 backdrop-blur md:hidden">
            <div className="flex gap-2">
              {Array.isArray((data as any)?.bookableItems) &&
              (data as any).bookableItems.length > 0 ? (
                <Link
                  to="/businesses/$slug/book"
                  params={{ slug }}
                  onClick={() => track("book_click")}
                  className="flex-1"
                >
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ backgroundColor: accent || undefined }}
                  >
                    <CalendarDays className="mr-1 h-4 w-4" />
                    Book now
                  </Button>
                </Link>
              ) : (
                <Button size="sm" className="flex-1" asChild>
                  <a href="#inquiry">
                    <Mail className="mr-1 h-4 w-4" />
                    Get a quote
                  </a>
                </Button>
              )}
              {telHref && (
                <Button size="sm" variant="outline" asChild onClick={() => track("call_click")}>
                  <a href={telHref}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {whatsappHref && (
                <Button
                  size="sm"
                  asChild
                  className="bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                  onClick={() => track("whatsapp_click")}
                >
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function statusClass(state: HoursStatus["state"]) {
  switch (state) {
    case "open":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "closing_soon":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "opening_soon":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "closed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "hidden";
  }
}

function StatusPill({
  hours,
  which,
  prefix,
}: {
  hours: any;
  which: "primary" | "store";
  prefix?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const status = getStatus(hours, now, which);
  if (status.state === "unknown") return null;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(status.state)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {prefix ? <span className="opacity-70">{prefix}:</span> : null}
      <span>{status.label}</span>
      {status.detail ? <span className="opacity-70">· {status.detail}</span> : null}
    </div>
  );
}

function WeekGrid({ week }: { week: StructuredHours["primary"] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {DAY_KEYS.map((d) => {
        const ds = week[d];
        let text = "Closed";
        if (ds?.mode === "24h") text = "24 hours";
        else if (ds?.mode === "open" && ds.ranges?.length)
          text = ds.ranges.map(formatRange).join(", ");
        return (
          <div key={d} className="contents">
            <dt className="text-muted-foreground">{DAY_LABELS[d]}</dt>
            <dd>{text}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function BusinessHoursBlock({ hours, isFuelStation }: { hours: any; isFuelStation: boolean }) {
  const legacy = legacyToRows(hours);
  if (legacy) {
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {legacy.map((r) => (
          <div key={r.day} className="contents">
            <dt className="text-muted-foreground capitalize">{r.day}</dt>
            <dd>{r.text}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (!isStructuredHours(hours)) return null;
  const hasStore = !!hours.store;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill
          hours={hours}
          which="primary"
          prefix={hasStore && isFuelStation ? "Pumps" : undefined}
        />
        {hasStore && (
          <StatusPill hours={hours} which="store" prefix={isFuelStation ? "Store" : "Store"} />
        )}
      </div>
      <div>
        {hasStore && isFuelStation && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pumps
          </div>
        )}
        <WeekGrid week={hours.primary} />
      </div>
      {hasStore && hours.store && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Store / Sari-Sari
          </div>
          <WeekGrid week={hours.store} />
        </div>
      )}
    </div>
  );
}

// ---------- Grouped tag display ----------
type TagItem = {
  slug: string;
  label: string;
  category: string | null;
  type_slug?: string | null;
  description?: string | null;
};

const TAG_GROUP_MAP: { label: string; cats: string[] }[] = [
  { label: "Fuels", cats: ["fuel_grade", "fuel"] },
  { label: "EV charging", cats: ["ev_charging"] },
  { label: "Brands", cats: ["station_brand", "brand"] },
  { label: "Tires & wheels", cats: ["tires", "wheels"] },
  {
    label: "Services",
    cats: [
      "station_services",
      "service",
      "service_mode",
      "maintenance",
      "brakes",
      "drivetrain",
      "engine",
      "cooling",
      "suspension",
      "climate",
      "electrical",
      "exhaust",
      "diagnostics",
      "wash",
      "detail",
      "paint",
      "body",
      "glass",
      "mobile",
      "roadside",
      "inspection",
      "specialty",
      "performance",
    ],
  },
  {
    label: "Products on sale",
    cats: [
      "station_products",
      "parts",
      "parts_sold",
      "inventory_type",
      "equipment",
      "electronics",
      "interior",
      "exterior",
      "styling",
      "protection",
    ],
  },
  { label: "Payment accepted", cats: ["station_payment", "payment", "financing"] },
  { label: "Languages", cats: ["language"] },
  {
    label: "Coverage",
    cats: ["vehicle_scope", "coverage", "buyback", "channel", "logistics", "condition", "trust"],
  },
  { label: "Hours", cats: ["hours", "operations"] },
];

function renderGroups(tags: TagItem[]): { label: string; items: TagItem[] }[] {
  const groups: { label: string; items: TagItem[] }[] = [];
  const used = new Set<string>();
  for (const g of TAG_GROUP_MAP) {
    const items = tags.filter((t) => t.category && g.cats.includes(t.category));
    if (items.length > 0) {
      groups.push({ label: g.label, items });
      items.forEach((i) => used.add(i.slug));
    }
  }
  const other = tags.filter((t) => !used.has(t.slug));
  if (other.length > 0) groups.push({ label: "Other", items: other });
  return groups;
}

function TagGroups({
  tags,
  primaryTypeSlug,
  typeLabels,
}: {
  tags: TagItem[];
  primaryTypeSlug?: string | null;
  typeLabels?: Record<string, string>;
}) {
  // Split into primary (matches business type or untyped) vs cross-type offerings.
  const primary = tags.filter(
    (t) => !t.type_slug || !primaryTypeSlug || t.type_slug === primaryTypeSlug,
  );
  const crossByType = new Map<string, TagItem[]>();
  for (const t of tags) {
    if (t.type_slug && primaryTypeSlug && t.type_slug !== primaryTypeSlug) {
      const list = crossByType.get(t.type_slug) ?? [];
      list.push(t);
      crossByType.set(t.type_slug, list);
    }
  }

  const primaryGroups = renderGroups(primary);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mt-3 space-y-3">
        {primaryGroups.map((g) => (
          <div key={`primary-${g.label}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {g.items.map((t) => (
                <PressableTooltip
                  key={t.slug}
                  content={t.description || `${g.label} service`}
                >
                  <Badge variant="secondary" className="cursor-help">
                    {t.label}
                  </Badge>
                </PressableTooltip>
              ))}
            </div>
          </div>
        ))}

        {Array.from(crossByType.entries()).map(([typeSlug, items]) => {
          const typeLabel = typeLabels?.[typeSlug] ?? typeSlug;
          const subGroups = renderGroups(items);
          return (
            <div
              key={`cross-${typeSlug}`}
              className="rounded-md border border-dashed border-border/70 bg-muted/20 p-2"
            >
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Also offered
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {typeLabel}
                </Badge>
              </div>
              <div className="mt-2 space-y-2">
                {subGroups.map((g) => (
                  <div key={`${typeSlug}-${g.label}`}>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                      {g.label}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {g.items.map((t) => (
                        <PressableTooltip
                          key={t.slug}
                          content={t.description || `${g.label} · ${typeLabel}`}
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-help bg-accent/40"
                          >
                            {t.label}
                          </Badge>
                        </PressableTooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

