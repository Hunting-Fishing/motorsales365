import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Clock, MessageSquare, Megaphone, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/wanted/$id")({
  component: WantedDetail,
  head: () => ({
    meta: [
      { title: "Wanted request — 365 Motor Sales" },
      { name: "description", content: "Respond to a buyer's wanted request on 365 Motor Sales." },
    ],
  }),
});

type WantedPost = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  budget_min_php: number | null;
  budget_max_php: number | null;
  region: string | null;
  city: string | null;
  contact_method: string;
  contact_value: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  response_count: number;
};

type Response = {
  id: string;
  user_id: string;
  message: string;
  contact_value: string | null;
  listing_id: string | null;
  business_id: string | null;
  created_at: string;
};

function WantedDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<WantedPost | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: r }] = await Promise.all([
        (supabase as any).from("wanted_posts").select("*").eq("id", id).maybeSingle(),
        (supabase as any)
          .from("wanted_post_responses_public")
          .select("*")
          .eq("wanted_post_id", id)
          .order("created_at", { ascending: false }),
      ]);
      let rows = (r ?? []) as Response[];
      // contact_value is only visible to the responder or the wanted-post owner
      // (RLS on the base table enforces this).
      if (user) {
        const { data: withContact } = await (supabase as any)
          .from("wanted_post_responses")
          .select("id,contact_value")
          .eq("wanted_post_id", id);
        if (withContact) {
          const byId = new Map<string, string | null>(
            (withContact as any[]).map((x) => [x.id, x.contact_value ?? null]),
          );
          rows = rows.map((row) => ({ ...row, contact_value: byId.get(row.id) ?? null }));
        }
      }
      setPost(p as WantedPost | null);
      setResponses(rows);
      setLoading(false);
    })();
  }, [id, refreshKey, user]);

  async function submitResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/wanted/${id}` } as any });
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Message must be at least 5 characters");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("wanted_post_responses").insert({
      wanted_post_id: id,
      user_id: user.id,
      message: message.trim(),
      contact_value: contact.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    setContact("");
    setRefreshKey((k) => k + 1);
    toast.success("Response sent");
  }

  async function closePost() {
    if (!user || !post || post.user_id !== user.id) return;
    if (!confirm("Mark this wanted request as closed?")) return;
    const { error } = await (supabase as any)
      .from("wanted_posts")
      .update({ status: "closed" })
      .eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as closed");
    setRefreshKey((k) => k + 1);
  }

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-12 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (!post) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="font-display text-2xl font-bold">Wanted request not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been closed or removed.</p>
          <Button asChild className="mt-4">
            <Link to="/wanted">Back to wanted board</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const isOwner = user?.id === post.user_id;
  const isClosed = post.status !== "open";

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link to="/wanted" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to wanted board
        </Link>

        <article className="mt-3 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <Badge variant="outline" className="capitalize">
                {post.category}
              </Badge>
              {isClosed && <Badge variant="secondary">Closed</Badge>}
            </div>
            {isOwner && !isClosed && (
              <Button size="sm" variant="outline" onClick={closePost}>
                Mark as closed
              </Button>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{post.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(post.budget_min_php || post.budget_max_php) && (
              <span>
                Budget:{" "}
                {post.budget_min_php ? formatPHP(post.budget_min_php) : "any"}
                {" – "}
                {post.budget_max_php ? formatPHP(post.budget_max_php) : "any"}
              </span>
            )}
            {(post.region || post.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[post.city, post.region].filter(Boolean).join(", ")}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Posted {formatDate(post.created_at)} · expires{" "}
              {formatDate(post.expires_at)}
            </span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{post.description}</p>
          <div className="mt-4 text-xs text-muted-foreground">
            Preferred contact: <span className="font-medium capitalize">{post.contact_method}</span>
            {post.contact_value && isOwner && ` · ${post.contact_value}`}
          </div>
        </article>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
            <MessageSquare className="h-5 w-5" /> Responses ({post.response_count})
          </h2>

          {!isClosed && !isOwner && (
            <form
              onSubmit={submitResponse}
              className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="space-y-2">
                <Label htmlFor="msg">Your response</Label>
                <Textarea
                  id="msg"
                  rows={4}
                  maxLength={2000}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I have a matching vehicle/service. Link or details…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cv">Contact (optional)</Label>
                <Input
                  id="cv"
                  maxLength={200}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone, Viber, Messenger, or listing link"
                />
              </div>
              <FormFeedbackLink formId="wanted-respond" className="mb-1" />
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : user ? "Send response" : "Sign in to respond"}
                </Button>
              </div>
            </form>
          )}

          {isClosed && (
            <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              This request is closed and is no longer accepting responses.
            </div>
          )}

          {responses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No responses yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {responses.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Response · {formatDate(r.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
                  {r.contact_value && (isOwner || r.user_id === user?.id) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Contact: <span className="font-medium">{r.contact_value}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="mt-8 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Stay safe: verify OR/CR, meet in person, and never send full payment before document
            checks. Report suspicious activity via{" "}
            <Link to="/report" className="underline">
              Report a scam
            </Link>
            .
          </p>
        </aside>
      </div>
    </SiteLayout>
  );
}
