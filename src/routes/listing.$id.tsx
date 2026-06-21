import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/route-boundaries";
import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Heart,
  Flag,
  Star,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Truck,
  Eye,
  Bookmark,
  Banknote,
  Shield,
  FileText,
  ClipboardCheck,
  Wrench,
  MessageCircle,
  ChevronDown,
  Play,
  Expand,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { waMeUrl } from "@/lib/whatsapp";
import { ServiceInquiryDialog } from "@/components/service-inquiry-dialog";

import { AffiliatePartsSection } from "@/components/affiliate-parts-section";
import { NeededPartsRail } from "@/components/listing/needed-parts-rail";
import { GalleryLightbox } from "@/components/listing/gallery-lightbox";
import { MobileActionBar } from "@/components/listing/mobile-action-bar";
import { ListingReportsSection } from "@/components/listing/listing-reports-section";
import { FormFeedbackLink } from "@/components/form-feedback";
import { ListingWantedBadge } from "@/components/parts-wanted/wanted-badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { DealerSubscriptionBadge } from "@/components/dealer-subscription-badge";
import { getActiveDealerStatus } from "@/lib/seller-status.functions";
import { SellerReputationBadges } from "@/components/seller-reputation-badges";
import { BuyerDocumentChecklist } from "@/components/buyer-document-checklist";
import { getSellerReputationStats } from "@/lib/reputation.functions";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPHP, formatDate } from "@/lib/format";
import { ListingPrice } from "@/components/listing-price";
import { ListingBadges, pickHeadlinePrice } from "@/components/listings/listing-badges";
import { PricingWidget } from "@/components/listings/pricing-widget";
import placeholderCar from "@/assets/placeholder-car.webp";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ListingQr } from "@/components/listing-qr";
import { siteUrl } from "@/lib/site-config";
import { ListingActionsMenu } from "@/components/listings/listing-actions-menu";
import { PriceTrendBadge } from "@/components/listings/price-trend-badge";
import { PromoBadge } from "@/components/listings/promo-badge";
import { PriceHistoryDisclosure } from "@/components/listing/price-history-disclosure";
import { useListingPriceTrend } from "@/hooks/use-listing-price-trend";
import { useListingPromo } from "@/hooks/use-listing-promo";

const REPORT_REASONS = [
  "Suspected scam or fraud",
  "Wrong category",
  "Misleading photos or description",
  "Vehicle already sold",
  "Prohibited item",
  "Other",
];

function SectionCard({
  title,
  meta,
  defaultOpen,
  className,
  children,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const isDesktop =
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const open = defaultOpen ?? isDesktop;
  return (
    <Collapsible
      defaultOpen={open}
      className={`mt-6 rounded-xl border border-border bg-card p-5 ${className ?? ""}`}
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {meta}
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="mt-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}


export const Route = createFileRoute("/listing/$id")({
  loader: async ({ params }) => {
    try {
      const { data: l } = await supabase
        .from("listings")
        .select("id,title,description,price_php,region,city,category_slug,status")
        .eq("id", params.id)
        .in("status", ["active", "pending_sale"])
        .maybeSingle();
      if (!l) return { seo: null };
      const { data: media } = await supabase
        .from("listing_media")
        .select("url,type")
        .eq("listing_id", params.id)
        .eq("type", "photo")
        .order("position", { ascending: true })
        .limit(1);
      return {
        seo: {
          id: (l as any).id,
          title: (l as any).title as string,
          description: ((l as any).description as string | null) ?? null,
          price: Number((l as any).price_php),
          region: (l as any).region as string | null,
          city: (l as any).city as string | null,
          cover: (media?.[0] as any)?.url ?? null,
        },
      };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = `https://www.365motorsales.com/listing/${params.id}`;
    if (!seo) {
      return {
        meta: [
          { title: "Listing — 365 MotorSales Philippines" },
          { name: "description", content: "View vehicle listing on 365 MotorSales Philippines." },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const loc = [seo.city, seo.region].filter(Boolean).join(", ");
    const price = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(seo.price);
    const title = `${seo.title} — ${price}${loc ? ` · ${loc}` : ""} | 365 MotorSales`;
    const desc = (
      seo.description ??
      `${seo.title} for sale${loc ? ` in ${loc}` : ""} on 365 MotorSales Philippines.`
    ).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(seo.cover
          ? [
              { property: "og:image", content: seo.cover },
              { name: "twitter:image", content: seo.cover },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ListingDetailPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary message="Listing not found." />,
});

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  price_php: number;
  monthly_php?: number | string | null;
  down_payment_php?: number | string | null;
  negotiable?: boolean | null;
  price_hidden?: boolean | null;
  registration_status?: "registered" | "unregistered" | "for_transfer" | "unknown" | null;
  region: string | null;
  city: string | null;
  status: string;
  plan: string;
  seller_type: "private" | "business";
  boost_until: string | null;
  category_slug: string;
  contact_phone: string | null;
  allow_messages: boolean;
  attributes: Record<string, any>;
  user_id: string;
  published_at: string | null;
  view_count: number;
}

function ListingDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [media, setMedia] = useState<{ id: string; url: string; type: "photo" | "video" }[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [sellerDealerPlan, setSellerDealerPlan] = useState<string | null>(null);
  const [sellerDealerPeriodEnd, setSellerDealerPeriodEnd] = useState<string | null>(null);
  const [sellerDealerCancelAtPeriodEnd, setSellerDealerCancelAtPeriodEnd] = useState<boolean>(false);
  const { data: sellerRepStats } = useQuery({
    queryKey: ["seller-rep-stats", listing?.user_id],
    queryFn: () => getSellerReputationStats({ data: { sellerId: listing!.user_id } }),
    enabled: !!listing?.user_id,
    staleTime: 5 * 60 * 1000,
  });
  const { data: priceTrendDetail } = useListingPriceTrend(listing?.id);
  const { data: listingPromoDetail } = useListingPromo(listing?.id);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (!l) {
        setListing(null);
        setLoading(false);
        return;
      }
      setListing(l as any);

      const { data: m } = await supabase
        .from("listing_media")
        .select("id,url,type")
        .eq("listing_id", id)
        .order("sort_order");
      setMedia((m as any) ?? []);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", l.user_id)
        .maybeSingle();
      setSeller(p);

      try {
        const { dealers } = await getActiveDealerStatus({ data: { userIds: [l.user_id] } });
        const info = dealers[l.user_id];
        setSellerDealerPlan(info?.planName ?? null);
        setSellerDealerPeriodEnd(info?.currentPeriodEnd ?? null);
        setSellerDealerCancelAtPeriodEnd(Boolean(info?.cancelAtPeriodEnd));
      } catch {
        setSellerDealerPlan(null);
        setSellerDealerPeriodEnd(null);
        setSellerDealerCancelAtPeriodEnd(false);
      }

      // Increment view count via RPC (counts every page load, anon allowed)
      supabase.rpc("increment_listing_view", {
        _listing_id: id,
        _viewer_id: user?.id ?? undefined,
      });

      // Like count (public)
      const { count: likes } = await supabase
        .from("listing_likes")
        .select("listing_id", { count: "exact", head: true })
        .eq("listing_id", id);
      setLikeCount(likes ?? 0);

      if (user) {
        const [{ data: fav }, { data: lk }] = await Promise.all([
          supabase
            .from("favorites")
            .select("listing_id")
            .eq("user_id", user.id)
            .eq("listing_id", id)
            .maybeSingle(),
          supabase
            .from("listing_likes")
            .select("listing_id")
            .eq("user_id", user.id)
            .eq("listing_id", id)
            .maybeSingle(),
        ]);
        setFavorited(!!fav);
        setLiked(!!lk);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (favorited) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
      setFavorited(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
      setFavorited(true);
      toast.success("Saved to your bookmarks");
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error("Sign in to like this listing");
      navigate({ to: "/login" });
      return;
    }
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("listing_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", id);
      if (error) {
        setLiked(true);
        setLikeCount((c) => c + 1);
        toast.error(error.message);
      }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase
        .from("listing_likes")
        .insert({ user_id: user.id, listing_id: id });
      if (error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
        toast.error(error.message);
      }
    }
  };

  const sendMessage = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!message.trim() || !listing) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      listing_id: listing.id,
      sender_id: user.id,
      recipient_id: listing.user_id,
      body: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    toast.success("Message sent — check your messages for replies.");
  };

  const submitReport = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setSubmittingReport(true);
    const { error } = await supabase.from("reports").insert({
      listing_id: id,
      reporter_id: user.id,
      reason: reportReason,
      details: reportDetails || null,
    });
    setSubmittingReport(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReportOpen(false);
    setReportDetails("");
    toast.success("Report submitted. Thank you.");
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (!listing) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Listing not found</h1>
          <p className="text-muted-foreground">It may have been removed or expired.</p>
          <Button asChild className="mt-4">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  const cover = photos[activeIdx] ?? photos[0];
  const boosted = listing.boost_until && new Date(listing.boost_until) > new Date();

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/browse/$category"
          params={{ category: listing.category_slug }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to listings
        </Link>
      </div>

      <div className="container mx-auto grid gap-8 px-4 pb-12 lg:grid-cols-[1fr_380px]">
        <div>
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[16/10] bg-secondary">
              <button
                type="button"
                onClick={() => photos.length > 0 && setLightboxOpen(true)}
                className="block h-full w-full"
                aria-label="Open photo"
              >
                <ImageWithSkeleton
                  src={cover?.url || placeholderCar}
                  alt={cover ? listing.title : "Vehicle photo coming soon"}
                  eager
                />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 md:opacity-100"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              {photos.length > 0 && (
                <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
                  <Expand className="h-3 w-3" /> {activeIdx + 1} / {photos.length}
                </div>
              )}
            </div>
            {(photos.length > 1 || videos.length > 0) && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveIdx(i)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${i === activeIdx ? "border-primary" : "border-transparent"}`}
                  >
                    <ImageWithSkeleton src={p.url} alt={`${listing.title} photo ${i + 1}`} />
                  </button>
                ))}
                {videos.map((v, vi) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setActiveIdx(photos.length + vi);
                      setLightboxOpen(true);
                    }}
                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-black"
                    aria-label="Play video"
                  >
                    <video src={v.url} className="h-full w-full object-cover" muted />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <GalleryLightbox
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            items={[...photos, ...videos]}
            index={activeIdx}
            onIndexChange={setActiveIdx}
            title={listing.title}
          />

          {listing.status === "pending_sale" && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
                ⏳
              </span>
              <div className="text-sm">
                <div className="font-semibold text-foreground">Pending Sale</div>
                <p className="text-muted-foreground">
                  The seller is finalizing a sale on this vehicle. You can still send a message or
                  make a backup offer — the listing will return to active if the deal doesn't go
                  through.
                </p>
              </div>
            </div>
          )}

          {/* Title block */}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={listing.seller_type === "business" ? "default" : "secondary"}>
                  {listing.seller_type === "business" ? "Business seller" : "Private seller"}
                </Badge>
                {seller?.verification_status === "verified" && (
                  <VerifiedBadge size="md" showLabel />
                )}
                {boosted && (
                  <Badge className="bg-accent text-accent-foreground">
                    <Star className="mr-1 h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{listing.title}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[listing.city, listing.region].filter(Boolean).join(", ") || "Philippines"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(() => {
                const headline = pickHeadlinePrice(listing);
                return (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <ListingPrice
                      pricePhp={headline.amount}
                      size="lg"
                      headlineKind={headline.kind === "hidden" ? "asking" : headline.kind}
                      negotiable={!!listing.negotiable}
                      priceHidden={!!listing.price_hidden || headline.kind === "hidden"}
                    />
                    <PriceTrendBadge trend={priceTrendDetail ?? null} size="md" />
                  </div>
                );
              })()}
              <PromoBadge promo={listingPromoDetail ?? null} />
              <PricingWidget listing={listing} size="md" />
              <ListingBadges
                listing={{
                  ...listing,
                  seller_dealer_plan: sellerDealerPlan,
                  seller_verified: !!(seller as any)?.verification_status,
                  headlineKind:
                    pickHeadlinePrice(listing).kind === "hidden"
                      ? null
                      : (pickHeadlinePrice(listing).kind as "asking" | "monthly" | "down_payment"),
                }}
                size="md"
              />
              <PriceHistoryDisclosure listingId={listing.id} />
            </div>
          </div>

          {/* Engagement bar */}
          <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">{(listing.view_count ?? 0).toLocaleString()} views</span>
              <span className="sm:hidden">{(listing.view_count ?? 0).toLocaleString()}</span>
            </span>
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              onClick={toggleLike}
              className="shrink-0 rounded-full"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""} sm:mr-1.5`} />
              <span className="hidden sm:inline">
                {likeCount.toLocaleString()} {likeCount === 1 ? "Like" : "Likes"}
              </span>
              <span className="ml-1 sm:hidden">{likeCount.toLocaleString()}</span>
            </Button>
            <Button
              variant={favorited ? "default" : "outline"}
              size="sm"
              onClick={toggleFavorite}
              className="shrink-0 rounded-full"
            >
              <Bookmark className={`h-4 w-4 ${favorited ? "fill-current" : ""} sm:mr-1.5`} />
              <span className="hidden sm:inline">{favorited ? "Saved" : "Save"}</span>
            </Button>
          </div>


          {/* Service tags */}
          {Array.isArray(listing.attributes?.tags) && listing.attributes.tags.length > 0 && (
            <SectionCard
              title="Services & offerings"
              meta={<span>{listing.attributes.tags.length}</span>}
            >
              <div className="flex flex-wrap gap-1.5">
                {(listing.attributes.tags as string[]).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Specs */}
          {(() => {
            const specEntries = Object.entries(listing.attributes ?? {}).filter(
              ([k]) => k !== "tags",
            );
            if (specEntries.length === 0) return null;
            return (
              <SectionCard
                title="Specifications"
                meta={
                  <span>
                    {specEntries.length} {specEntries.length === 1 ? "spec" : "specs"}
                  </span>
                }
              >
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {specEntries.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-3 border-b border-border/60 pb-2 text-sm"
                    >
                      <dt className="capitalize text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </dt>
                      <dd className="font-medium text-right">
                        {Array.isArray(v)
                          ? v.join(", ")
                          : typeof v === "boolean"
                            ? v
                              ? "Yes"
                              : "No"
                            : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
            );
          })()}

          {/* Description */}
          <SectionCard title="Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {listing.description || "No description provided."}
            </p>
          </SectionCard>

          {/* In-house parts — buyer can request quote for items the seller flagged.
              Component renders its own card with internal collapse. */}
          {(listing.category_slug === "cars" ||
            listing.category_slug === "motorcycles" ||
            listing.category_slug === "car" ||
            listing.category_slug === "motorcycle") && (
            <NeededPartsRail listingId={listing.id} />
          )}

          {/* Affiliate parts — revenue: commission on partner shop checkouts */}
          {listing.category_slug !== "towing" && listing.category_slug !== "services" && (
            <SectionCard title="Parts & accessories for this car">
              <AffiliatePartsSection
                make={listing.attributes?.make ?? null}
                model={listing.attributes?.model ?? null}
                year={listing.attributes?.year ? Number(listing.attributes.year) : null}
                listingId={listing.id}
              />
            </SectionCard>
          )}

          {(listing.category_slug === "cars" ||
            listing.category_slug === "motorcycles" ||
            listing.category_slug === "trucks") && <BuyerDocumentChecklist />}



          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Listed {formatDate(listing.published_at)}</span>
            <span>·</span>
            <span>{(listing.view_count ?? 0).toLocaleString()} views</span>
            <span>·</span>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1 hover:text-destructive">
                  <Flag className="h-3 w-3" /> Report listing
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report this listing</DialogTitle>
                  <DialogDescription>
                    Help us keep 365 MotorSales Philippines safe. Our team will review your report.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Reason</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional details (optional)</Label>
                    <Textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Tell us more…"
                    />
                  </div>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <FormFeedbackLink formId="report-listing" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitReport} disabled={submittingReport}>
                    {submittingReport ? "Submitting…" : "Submit report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 pb-20 lg:sticky lg:top-20 lg:self-start lg:pb-0">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">Seller</h3>
              <ListingActionsMenu
                listingId={listing.id}
                sellerUserId={listing.user_id}
                sellerName={seller?.business_name ?? seller?.full_name ?? null}
                variant="inline"
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-semibold">
                {(seller?.business_name ?? seller?.full_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    to="/seller/$id"
                    params={{ id: listing.user_id }}
                    className="truncate font-medium hover:text-primary"
                  >
                    {seller?.business_name ?? seller?.full_name ?? "Seller"}
                  </Link>
                  {seller?.verification_status === "verified" && (
                    <VerifiedBadge size="sm" showLabel />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{listing.seller_type === "business" ? "Business" : "Private"} seller</span>
                  {listing.seller_type === "business" && sellerDealerPlan && (
                    <DealerSubscriptionBadge
                      planName={sellerDealerPlan}
                      currentPeriodEnd={sellerDealerPeriodEnd}
                      cancelAtPeriodEnd={sellerDealerCancelAtPeriodEnd}
                      size="sm"
                      showRenewal
                    />
                  )}
                </div>
                <SellerReputationBadges
                  className="mt-2"
                  size="sm"
                  profile={{
                    verification_status: seller?.verification_status,
                    fb_verified_at: seller?.fb_verified_at,
                    is_founding_member: seller?.is_founding_member,
                    seller_rating_avg: seller?.seller_rating_avg,
                    seller_rating_count: seller?.seller_rating_count,
                    documents_verified_count: sellerRepStats?.documents_verified_count,
                    fast_response: sellerRepStats?.fast_response,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {listing.contact_phone && (
                <a href={`tel:${listing.contact_phone}`}>
                  <Button className="w-full" variant="default">
                    <Phone className="mr-2 h-4 w-4" />
                    Call seller
                  </Button>
                </a>
              )}
              {listing.contact_phone && waMeUrl(listing.contact_phone) && (
                <a
                  href={
                    waMeUrl(
                      listing.contact_phone,
                      `Hi! I'm interested in your listing "${listing.title}" on 365 Motor Sales: ${siteUrl(typeof window !== "undefined" ? window.location.pathname : "/")}`,
                    )!
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5d]">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp seller
                  </Button>
                </a>
              )}
              {listing.allow_messages && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    messageRef.current?.focus();
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Message seller
                </Button>
              )}
              <ListingQr
                listingId={listing.id}
                title={listing.title}
                pricePhp={listing.price_php}
                location={[listing.city, listing.region].filter(Boolean).join(", ") || null}
                coverUrl={photos[0]?.url ?? null}
                className="w-full"
              />
              {listing.category_slug !== "towing" && (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/tow" search={{ listing: listing.id }}>
                    <Truck className="mr-2 h-4 w-4" /> Need this towed?
                  </Link>
                </Button>
              )}
              {listing.category_slug === "towing" && (
                <Button asChild className="w-full">
                  <Link to="/tow" search={{ provider: listing.id }}>
                    <Truck className="mr-2 h-4 w-4" /> Request a tow from this provider
                  </Link>
                </Button>
              )}
            </div>
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3 w-3" /> Report this listing
            </button>
          </div>

          <ListingReportsSection listingId={listing.id} />

          <div className="mt-2">
            <ListingWantedBadge listingId={listing.id} />
          </div>



          {/* Services around this vehicle — coming soon.
              Revenue: lead-gen for finance/insurance/OR-CR partners (not yet wired). */}
          <Collapsible
            defaultOpen
            className="rounded-xl border border-border bg-card p-5"
          >
            <CollapsibleTrigger className="group flex w-full items-start justify-between gap-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    Need inspection or insurance for this car?
                  </h3>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    Coming soon
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Free quotes from vetted PH partners — financing, insurance, OR/CR, title
                  transfer, and a 365-vetted pre-purchase inspection from ₱99. One form, no
                  commitment.
                </p>
              </div>
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { Icon: Wrench, label: "Request a pre-purchase inspection", span: true },
                  { Icon: Shield, label: "Get insurance quote" },
                  { Icon: Banknote, label: "Get financing" },
                  { Icon: FileText, label: "OR/CR renewal help" },
                  { Icon: ClipboardCheck, label: "Title transfer help" },
                ].map(({ Icon, label, span }) => (
                  <Button
                    key={label}
                    variant="outline"
                    disabled
                    aria-disabled="true"
                    title="Coming soon"
                    className={cn(
                      "w-full min-w-0 justify-start gap-2 opacity-70",
                      span && "sm:col-span-2",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Soon
                    </span>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Partner network launching shortly. We'll notify you when quotes go live.
              </p>
            </CollapsibleContent>
          </Collapsible>

          <AdCarousel placement="listing_sidebar" />

          {listing.allow_messages && (
            <Collapsible defaultOpen className="rounded-xl border border-border bg-card p-5">
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <MessageSquare className="h-4 w-4" /> Send a message
                </h3>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, is this still available?"
                  className="mt-3"
                  rows={4}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !message.trim()}
                  className="mt-2 w-full"
                >
                  {sending ? "Sending…" : "Send message"}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}

        </aside>
      </div>
      <MobileActionBar
        phone={listing.contact_phone}
        whatsappMessage={`Hi! I'm interested in your listing "${listing.title}" on 365 Motor Sales: ${siteUrl(typeof window !== "undefined" ? window.location.pathname : "/")}`}
        allowMessages={listing.allow_messages}
        onMessageClick={() => {
          messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          messageRef.current?.focus();
        }}
      />
    </SiteLayout>
  );
}
