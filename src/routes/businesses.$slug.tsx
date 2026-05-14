import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Globe, MessageCircle, Star, Store as StoreIcon, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BusinessMap } from "@/components/businesses/business-map";
import { ShareQr } from "@/components/share-qr";

export const Route = createFileRoute("/businesses/$slug")({
  component: BusinessProfilePage,
});

type Business = {
  id: string; slug: string; name: string; type_slug: string; description: string | null;
  logo_url: string | null; cover_url: string | null; photos: string[];
  phone: string | null; email: string | null; website: string | null; messenger_url: string | null;
  hours: Record<string, string> | null;
  region: string | null; province: string | null; city: string | null; barangay: string | null; street_address: string | null;
  lat: number | null; lng: number | null;
  rating_avg: number; rating_count: number; featured: boolean;
};
type Review = { id: string; user_id: string; rating: number; body: string | null; created_at: string };

function BusinessProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [biz, setBiz] = useState<Business | null>(null);
  const [typeLabel, setTypeLabel] = useState("");
  const [tagLabels, setTagLabels] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) { setBiz(null); setLoading(false); return; }
    setBiz(data as Business);

    const [{ data: t }, { data: links }, { data: revs }] = await Promise.all([
      (supabase as any).from("business_types").select("label").eq("slug", data.type_slug).maybeSingle(),
      (supabase as any).from("business_tag_links").select("tag_slug").eq("business_id", data.id),
      (supabase as any).from("business_reviews").select("id,user_id,rating,body,created_at").eq("business_id", data.id).eq("status", "active").order("created_at", { ascending: false }),
    ]);
    setTypeLabel(t?.label ?? "");
    const slugs = (links ?? []).map((l: any) => l.tag_slug);
    if (slugs.length > 0) {
      const { data: tagRows } = await (supabase as any).from("business_tags").select("slug,label").in("slug", slugs);
      setTagLabels((tagRows ?? []).map((r: any) => r.label));
    } else setTagLabels([]);
    setReviews(revs ?? []);
    const uids = Array.from(new Set((revs ?? []).map((r: any) => r.user_id)));
    if (uids.length > 0) {
      const { data: profs } = await (supabase as any).from("profiles").select("id,full_name").in("id", uids);
      const m: Record<string, string> = {};
      for (const p of profs ?? []) m[p.id] = p.full_name ?? "User";
      setReviewerNames(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  const submitReview = async () => {
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (!biz) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("business_reviews")
      .upsert({ business_id: biz.id, user_id: user.id, rating, body: body.trim() || null }, { onConflict: "business_id,user_id" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    setBody("");
    load();
  };

  if (loading) return <SiteLayout><div className="container mx-auto p-8">Loading…</div></SiteLayout>;
  if (!biz) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Business not found</h1>
          <Link to="/businesses" className="mt-4 inline-block text-primary underline">Back to directory</Link>
        </div>
      </SiteLayout>
    );
  }

  const myReview = reviews.find((r) => r.user_id === user?.id);
  const location = [biz.barangay, biz.city, biz.province, biz.region].filter(Boolean).join(", ");

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <Link to="/businesses" className="text-sm text-muted-foreground hover:text-foreground">← Back to businesses</Link>

        <Card className="mt-4 overflow-hidden">
          {biz.cover_url && <div className="h-40 w-full bg-muted md:h-56"><img src={biz.cover_url} alt="" className="h-full w-full object-cover" /></div>}
          <div className="flex flex-wrap items-start gap-4 p-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {biz.logo_url ? <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover" /> : <StoreIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{biz.name}</h1>
                {biz.featured && <Badge>Featured</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{typeLabel}</div>
              {biz.rating_count > 0 && (
                <div className="mt-1 flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">{Number(biz.rating_avg).toFixed(1)}</span>
                  <span className="text-muted-foreground">({biz.rating_count} review{biz.rating_count === 1 ? "" : "s"})</span>
                </div>
              )}
              {location && (
                <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{biz.street_address ? `${biz.street_address}, ` : ""}{location}</span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {biz.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${biz.phone}`}><Phone className="mr-1 h-4 w-4" />{biz.phone}</a></Button>}
                {biz.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${biz.email}`}><Mail className="mr-1 h-4 w-4" />Email</a></Button>}
                {biz.website && <Button size="sm" variant="outline" asChild><a href={biz.website} target="_blank" rel="noreferrer"><Globe className="mr-1 h-4 w-4" />Website</a></Button>}
                {biz.messenger_url && <Button size="sm" variant="outline" asChild><a href={biz.messenger_url} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />Messenger</a></Button>}
              </div>
              {tagLabels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tagLabels.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-2 font-display text-lg font-semibold">About</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{biz.description || "No description provided."}</p>
            {biz.hours && Object.keys(biz.hours).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4" />Hours</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(biz.hours).map(([day, hrs]) => (
                    <div key={day} className="contents"><dt className="text-muted-foreground capitalize">{day}</dt><dd>{hrs}</dd></div>
                  ))}
                </dl>
              </div>
            )}
          </Card>
          <div>
            <BusinessMap
              region={biz.region}
              businesses={biz.lat && biz.lng ? [{
                id: biz.id, slug: biz.slug, name: biz.name, type_label: typeLabel,
                lat: Number(biz.lat), lng: Number(biz.lng), rating_avg: Number(biz.rating_avg),
                rating_count: biz.rating_count, city: biz.city, featured: biz.featured,
              }] : []}
            />
          </div>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Reviews</h2>
          {user ? (
            <div className="mb-6 rounded-lg border border-border p-4">
              <div className="mb-2 text-sm font-medium">{myReview ? "Update your review" : "Leave a review"}</div>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n}`}>
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience…" rows={3} maxLength={1000} />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={submitReview} disabled={submitting}>{submitting ? "Saving…" : (myReview ? "Update review" : "Submit review")}</Button>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline">Sign in</Link> to leave a review.
            </div>
          )}
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium">{reviewerNames[r.user_id] ?? "User"}</div>
                    <div className="flex items-center gap-1 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  {r.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
