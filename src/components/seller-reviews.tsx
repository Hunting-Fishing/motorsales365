import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

interface SellerReviewRow {
  id: string;
  reviewer_id: string;
  rating: number;
  body: string | null;
  transaction_completed: boolean;
  created_at: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
}

interface Props {
  sellerId: string;
  currentUserId: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  onChange?: () => void;
}

function Stars({ value, onChange, size = 5 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn("transition", onChange ? "hover:scale-110 cursor-pointer" : "cursor-default")}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              size === 4 ? "h-4 w-4" : "h-5 w-5",
              n <= value ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function SellerReviews({ sellerId, currentUserId, ratingAvg, ratingCount, onChange }: Props) {
  const [reviews, setReviews] = useState<SellerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("seller_reviews")
      .select("id,reviewer_id,rating,body,transaction_completed,created_at")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const rows: SellerReviewRow[] = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.reviewer_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("id,full_name,avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      rows.forEach((r) => {
        const p: any = map.get(r.reviewer_id);
        r.reviewer_name = p?.full_name ?? null;
        r.reviewer_avatar = p?.avatar_url ?? null;
      });
    }
    setReviews(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const myReview = currentUserId ? reviews.find((r) => r.reviewer_id === currentUserId) : null;
  const isSelf = currentUserId === sellerId;

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setBody(myReview.body ?? "");
    }
  }, [myReview?.id]);

  const submit = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to leave a review");
      return;
    }
    if (isSelf) {
      toast.error("You can't review yourself");
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error("Please pick a star rating");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("seller_reviews").upsert(
      {
        seller_id: sellerId,
        reviewer_id: currentUserId,
        rating,
        body: body.trim() || null,
        status: "active",
      },
      { onConflict: "seller_id,reviewer_id,listing_id" },
    );
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(myReview ? "Review updated" : "Thanks for your review!");
    await load();
    onChange?.();
  };

  const removeMine = async () => {
    if (!myReview) return;
    const { error } = await (supabase as any).from("seller_reviews").delete().eq("id", myReview.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    setRating(5);
    toast.success("Review removed");
    await load();
    onChange?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">
              {(Number(ratingAvg ?? 0) || 0).toFixed(1)}
            </span>
            <Stars value={Math.round(Number(ratingAvg ?? 0))} />
          </div>
          <div className="text-sm text-muted-foreground">
            {ratingCount ?? 0} {ratingCount === 1 ? "review" : "reviews"}
          </div>
        </div>
      </div>

      {!isSelf && currentUserId && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">
            {myReview ? "Update your review" : "Leave a review"}
          </div>
          <Stars value={rating} onChange={setRating} />
          <Textarea
            className="mt-3"
            placeholder="Share your experience with this seller (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            rows={3}
          />
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={submit} disabled={submitting} size="sm">
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {myReview ? "Save changes" : "Post review"}
            </Button>
            {myReview && (
              <Button variant="ghost" size="sm" onClick={removeMine}>
                Delete
              </Button>
            )}
          </div>
        </Card>
      )}

      {!currentUserId && (
        <Card className="p-4 text-sm text-muted-foreground">
          Sign in to leave a review for this seller.
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </div>
        ) : (
          reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {r.reviewer_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reviewer_avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                      {(r.reviewer_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {r.reviewer_name ?? "365 user"}
                    </span>
                    <Stars value={r.rating} size={4} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  {r.body && <p className="mt-1.5 whitespace-pre-wrap text-sm">{r.body}</p>}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
