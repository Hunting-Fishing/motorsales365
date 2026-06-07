import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Megaphone, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/sponsorships")({
  component: SponsorshipsPage,
  head: () => ({
    meta: [
      { title: "My sponsorships — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const PLACEMENTS = [
  { value: "homepage_banner", label: "Homepage banner" },
  { value: "category_banner", label: "Category banner" },
  { value: "listing_sidebar", label: "Listing sidebar" },
  { value: "newsletter", label: "Newsletter sponsorship" },
  { value: "sponsored_post", label: "Sponsored post / Academy spot (/learn)" },
  { value: "other", label: "Something else" },
] as const;

const STATUS_TONE: Record<string, { label: string; tone: string }> = {
  new: { label: "Pending review", tone: "bg-blue-500 text-white" },
  in_review: { label: "In review", tone: "bg-blue-500 text-white" },
  quoted: { label: "Quoted", tone: "bg-amber-500 text-white" },
  won: { label: "Approved", tone: "bg-emerald-500 text-white" },
  lost: { label: "Rejected", tone: "bg-destructive text-destructive-foreground" },
  spam: { label: "Closed", tone: "bg-muted text-muted-foreground" },
};

type Inquiry = {
  id: string;
  contact_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  placement: string;
  budget_range: string | null;
  start_date: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const editSchema = z.object({
  contact_name: z.string().trim().min(1).max(100),
  company: z.string().trim().max(120).nullable(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s\-().]*$/u, "Digits, spaces, + - ( ) only")
    .nullable()
    .or(z.literal("")),
  placement: z.string(),
  budget_range: z.string().trim().max(60).nullable().or(z.literal("")),
  start_date: z.string().nullable().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

function SponsorshipsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("ad_inquiries")
      .select(
        "id,contact_name,company,email,phone,placement,budget_range,start_date,message,status,created_at,updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Inquiry[]);
    setBusy(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <div className="p-6">Please sign in.</div>;

  const resubmit = async () => {
    if (!editing) return;
    const parsed = editSchema.safeParse({
      contact_name: editing.contact_name,
      company: editing.company,
      phone: editing.phone,
      placement: editing.placement,
      budget_range: editing.budget_range,
      start_date: editing.start_date,
      message: editing.message,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("ad_inquiries")
      .update({
        contact_name: editing.contact_name,
        company: editing.company || null,
        phone: editing.phone || null,
        placement: editing.placement as Inquiry["placement"] as any,
        budget_range: editing.budget_range || null,
        start_date: editing.start_date || null,
        message: editing.message,
        status: "new",
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resubmitted — our team will review it again shortly.");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6 p-1 md:p-4">
      <div>
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" /> My sponsorships
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your advertising and sponsorship inquiries. Rejected submissions can be edited
              and resubmitted for another review.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/advertise">New inquiry</Link>
          </Button>
        </div>
      </div>

      {busy ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          You haven't submitted any sponsorship inquiries yet.{" "}
          <Link to="/advertise" className="text-primary underline">
            Submit one
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((i) => {
            const tone = STATUS_TONE[i.status] ?? {
              label: i.status,
              tone: "bg-muted text-muted-foreground",
            };
            const rejected = i.status === "lost";
            return (
              <div key={i.id} className="rounded-md border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {i.company || i.contact_name}
                  </span>
                  <Badge className={tone.tone}>{tone.label}</Badge>
                  <Badge variant="outline">{i.placement}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Submitted {formatDate(i.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {i.message}
                </p>
                {rejected && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive-foreground/90">
                    This inquiry was not approved. You can update the details below and resubmit
                    it — our team will review it again.
                  </div>
                )}
                <div className="flex justify-end">
                  {rejected ? (
                    <Button size="sm" onClick={() => setEditing({ ...i })}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Edit & resubmit
                    </Button>
                  ) : i.status === "new" || i.status === "in_review" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="You can edit only after a decision"
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Awaiting review
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit & resubmit sponsorship</DialogTitle>
            <DialogDescription>
              Update your details and click Resubmit. Your inquiry will go back into pending review.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Your name *</Label>
                  <Input
                    value={editing.contact_name}
                    maxLength={100}
                    onChange={(e) =>
                      setEditing({ ...editing, contact_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={editing.company ?? ""}
                    maxLength={120}
                    onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editing.email} disabled />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editing.phone ?? ""}
                    maxLength={30}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Placement</Label>
                <Select
                  value={editing.placement}
                  onValueChange={(v) => setEditing({ ...editing, placement: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Monthly budget (₱)</Label>
                  <Input
                    value={editing.budget_range ?? ""}
                    maxLength={60}
                    onChange={(e) =>
                      setEditing({ ...editing, budget_range: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Ideal start date</Label>
                  <Input
                    type="date"
                    min={todayIso()}
                    value={editing.start_date ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, start_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>What are you trying to achieve? *</Label>
                <Textarea
                  rows={5}
                  value={editing.message}
                  maxLength={2000}
                  onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  {editing.message.length}/2000
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={resubmit} disabled={saving}>
              {saving ? "Resubmitting…" : "Resubmit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
