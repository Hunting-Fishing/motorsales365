import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Heart, Flag, Star, Phone, MessageSquare, ChevronLeft, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPHP, formatDate } from "@/lib/format";
import placeholderCar from "@/assets/placeholder-car.png";

const REPORT_REASONS = [
  "Suspected scam or fraud",
  "Wrong category",
  "Misleading photos or description",
  "Vehicle already sold",
  "Prohibited item",
  "Other",
];

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetailPage,
});

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  price_php: number;
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
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [favorited, setFavorited] = useState(false);
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
      if (!l) { setListing(null); setLoading(false); return; }
      setListing(l as any);

      const { data: m } = await supabase.from("listing_media").select("id,url,type").eq("listing_id", id).order("sort_order");
      setMedia((m as any) ?? []);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", l.user_id).maybeSingle();
      setSeller(p);

      // Increment view count
      await supabase.from("listings").update({ view_count: (l.view_count ?? 0) + 1 }).eq("id", id);

      if (user) {
        const { data: fav } = await supabase.from("favorites").select("listing_id").eq("user_id", user.id).eq("listing_id", id).maybeSingle();
        setFavorited(!!fav);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (favorited) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
      setFavorited(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
      setFavorited(true);
      toast.success("Saved to favorites");
    }
  };

  const sendMessage = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!message.trim() || !listing) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      listing_id: listing.id,
      sender_id: user.id,
      recipient_id: listing.user_id,
      body: message.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
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
    return <SiteLayout><div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div></SiteLayout>;
  }
  if (!listing) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Listing not found</h1>
          <p className="text-muted-foreground">It may have been removed or expired.</p>
          <Button asChild className="mt-4"><Link to="/">Go home</Link></Button>
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
        <Link to="/browse/$category" params={{ category: listing.category_slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to listings
        </Link>
      </div>

      <div className="container mx-auto grid gap-8 px-4 pb-12 lg:grid-cols-[1fr_380px]">
        <div>
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-[16/10] bg-secondary">
              <img
                src={cover?.url || placeholderCar}
                alt={cover ? listing.title : "Vehicle photo coming soon"}
                className="h-full w-full object-cover"
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
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {videos.map((v) => (
                  <video key={v.id} src={v.url} controls className="h-16 w-24 shrink-0 rounded-md border border-border bg-black object-cover" />
                ))}
              </div>
            )}
          </div>

          {listing.status === "pending_sale" && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">⏳</span>
              <div className="text-sm">
                <div className="font-semibold text-foreground">Pending Sale</div>
                <p className="text-muted-foreground">
                  The seller is finalizing a sale on this vehicle. You can still send a message or make a backup
                  offer — the listing will return to active if the deal doesn't go through.
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
                {boosted && <Badge className="bg-accent text-accent-foreground"><Star className="mr-1 h-3 w-3" />Featured</Badge>}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{listing.title}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[listing.city, listing.region].filter(Boolean).join(", ") || "Philippines"}
              </div>
            </div>
            <div className="text-3xl font-bold text-primary md:text-4xl">{formatPHP(listing.price_php)}</div>
          </div>

          {/* Specs */}
          {Object.keys(listing.attributes ?? {}).length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Specifications</h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(listing.attributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-2 text-sm">
                    <dt className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-medium">{String(v)}</dd>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REPORT_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
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
                  <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
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
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-semibold">Seller</h3>
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
                <div className="text-xs text-muted-foreground">
                  {listing.seller_type === "business" ? "Business" : "Private"} seller
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {listing.contact_phone && (
                <a href={`tel:${listing.contact_phone}`}>
                  <Button className="w-full" variant="default"><Phone className="mr-2 h-4 w-4" />Call seller</Button>
                </a>
              )}
              <Button variant="outline" className="w-full" onClick={toggleFavorite}>
                <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-destructive text-destructive" : ""}`} />
                {favorited ? "Saved" : "Save listing"}
              </Button>
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
              <Button onClick={sendMessage} disabled={sending || !message.trim()} className="mt-2 w-full">
                {sending ? "Sending…" : "Send message"}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </SiteLayout>
  );
}
