import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/route-boundaries";
import { useEffect, useState } from "react";
import {
  MapPin,
  Heart,
  Flag,
  Star,
  Phone,
  MessageSquare,
  ChevronLeft,
  Truck,
  Eye,
  Bookmark,
  Banknote,
  Shield,
  FileText,
  ClipboardCheck,
  Wrench,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { waMeUrl } from "@/lib/whatsapp";
import { ServiceInquiryDialog } from "@/components/service-inquiry-dialog";
import { ServiceStrip } from "@/components/service-strip";
import { AffiliatePartsSection } from "@/components/affiliate-parts-section";
import { QuoteRequestCta } from "@/components/quote-request-cta";
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
import placeholderCar from "@/assets/placeholder-car.webp";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ListingQr } from "@/components/listing-qr";
import { siteUrl } from "@/lib/site-config";
import { ListingActionsMenu } from "@/components/listings/listing-actions-menu";

const REPORT_REASONS = [
  "Suspected scam or fraud",
  "Wrong category",
  "Misleading photos or description",
  "Vehicle already sold",
  "Prohibited item",
  "Other",
];

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
  price_kind?: "asking" | "monthly" | "down_payment" | "starting_bid" | null;
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
            <div className="aspect-[16/10] bg-secondary">
              <ImageWithSkeleton
                src={cover?.url || placeholderCar}
                alt={cover ? listing.title : "Vehicle photo coming soon"}
                eager
              />
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
                {videos.map((v) => (
                  <video
                    key={v.id}
                    src={v.url}
                    controls
                    className="h-16 w-24 shrink-0 rounded-md border border-border bg-black object-cover"
                  />
                ))}
              </div>
            )}
          </div>

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
                {listing.seller_type === "business" && sellerDealerPlan && (
                  <DealerSubscriptionBadge
                    planName={sellerDealerPlan}
                    currentPeriodEnd={sellerDealerPeriodEnd}
                    cancelAtPeriodEnd={sellerDealerCancelAtPeriodEnd}
                    size="md"
                    showRenewal
                  />
                )}
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
            <ListingPrice pricePhp={listing.price_php} size="lg" />
          </div>

          {/* Engagement bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" /> {(listing.view_count ?? 0).toLocaleString()} views
            </span>
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              onClick={toggleLike}
              className="rounded-full"
            >
              <Heart className={`mr-1.5 h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likeCount.toLocaleString()} {likeCount === 1 ? "Like" : "Likes"}
            </Button>
            <Button
              variant={favorited ? "default" : "outline"}
              size="sm"
              onClick={toggleFavorite}
              className="rounded-full"
            >
              <Bookmark className={`mr-1.5 h-4 w-4 ${favorited ? "fill-current" : ""}`} />
              {favorited ? "Saved" : "Save"}
            </Button>
          </div>

          {/* Above-the-fold service CTA strip — revenue: lead-gen for finance/insurance/inspection partners */}
          {listing.category_slug !== "towing" && listing.category_slug !== "services" && (
            <ServiceStrip listingId={listing.id} vehicleSummary={listing.title} />
          )}

          {/* Service tags */}
          {Array.isArray(listing.attributes?.tags) && listing.attributes.tags.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Services & offerings</h2>
              <div className="flex flex-wrap gap-1.5">
                {(listing.attributes.tags as string[]).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          {Object.keys(listing.attributes ?? {}).filter((k) => k !== "tags").length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Specifications</h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(listing.attributes)
                  .filter(([k]) => k !== "tags")
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-3 border-b border-border/60 pb-2 text-sm"
                    >
                      <dt className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                      <dd className="font-medium text-right">
                        {Array.isArray(v)
                          ? v.join(", ")
                          : typeof v === "boolean"
                            ? v ? "Yes" : "No"
                            : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}

          {/* Description */}
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {listing.description || "No description provided."}
            </p>
          </div>

          {/* Affiliate parts — revenue: commission on partner shop checkouts */}
          {listing.category_slug !== "towing" && listing.category_slug !== "services" && (
            <AffiliatePartsSection
              make={listing.attributes?.make ?? null}
              model={listing.attributes?.model ?? null}
              year={listing.attributes?.year ? Number(listing.attributes.year) : null}
              listingId={listing.id}
            />
          )}

          {/* Buyer-safety upsell — links to /services/inspection (audit #20) */}
          {(listing.category_slug === "cars" ||
            listing.category_slug === "motorcycles" ||
            listing.category_slug === "trucks") && (
            <aside className="mt-6 rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold">
                    Before you pay — buyer safety add-ons
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional OR/CR review, seller ID verification, or a pre-purchase mechanic
                    inspection through a 365-vetted partner. Pricing from ₱99.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to="/services/inspection"
                      search={{ listing: listing.id } as any}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      Request inspection
                    </Link>
                    <Link
                      to="/services/inspection"
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      See the rate card
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {(listing.category_slug === "cars" ||
            listing.category_slug === "motorcycles" ||
            listing.category_slug === "trucks") && <BuyerDocumentChecklist />}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Listed {formatDate(listing.published_at)}</span>
            <span>·</span>
            <span>{listing.view_count} views</span>
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
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {listing.category_slug !== "services" && listing.category_slug !== "towing" && (
            <QuoteRequestCta
              listingId={listing.id}
              region={listing.region ?? undefined}
              budgetPhp={listing.price_php ?? undefined}
            />
          )}
          <AdCarousel placement="listing_sidebar" />
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
              <Button variant="outline" className="w-full" onClick={toggleFavorite}>
                <Heart
                  className={`mr-2 h-4 w-4 ${favorited ? "fill-destructive text-destructive" : ""}`}
                />
                {favorited ? "Saved" : "Save listing"}
              </Button>
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
          </div>

          {/* Services around this vehicle — revenue: lead-gen for finance/insurance/OR-CR partners */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-semibold">Services for this vehicle</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Free quotes from partner providers. No commitment.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ServiceInquiryDialog
                inquiryType="financing"
                listingId={listing.id}
                vehicleSummary={listing.title}
              >
                <Button variant="outline" className="w-full justify-start">
                  <Banknote className="mr-2 h-4 w-4" /> Get financing
                </Button>
              </ServiceInquiryDialog>
              <ServiceInquiryDialog
                inquiryType="insurance"
                listingId={listing.id}
                vehicleSummary={listing.title}
              >
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" /> Get insurance quote
                </Button>
              </ServiceInquiryDialog>
              <ServiceInquiryDialog
                inquiryType="or_cr"
                listingId={listing.id}
                vehicleSummary={listing.title}
              >
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" /> OR/CR renewal help
                </Button>
              </ServiceInquiryDialog>
              <ServiceInquiryDialog
                inquiryType="title_transfer"
                listingId={listing.id}
                vehicleSummary={listing.title}
              >
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Title transfer help
                </Button>
              </ServiceInquiryDialog>
              <ServiceInquiryDialog
                inquiryType="inspection"
                listingId={listing.id}
                vehicleSummary={listing.title}
              >
                <Button variant="outline" className="w-full justify-start sm:col-span-2">
                  <Wrench className="mr-2 h-4 w-4" /> Request a pre-purchase inspection
                </Button>
              </ServiceInquiryDialog>
            </div>
          </div>

          {listing.allow_messages && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <MessageSquare className="h-4 w-4" /> Send a message
              </h3>
              <Textarea
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
            </div>
          )}
        </aside>
      </div>
    </SiteLayout>
  );
}
