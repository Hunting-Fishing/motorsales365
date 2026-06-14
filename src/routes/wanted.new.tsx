import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
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
import { toast } from "sonner";
import { PH_REGIONS } from "@/lib/format";

export const Route = createFileRoute("/wanted/new")({
  component: NewWantedPage,
  head: () => ({
    meta: [
      { title: "Post a wanted request — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Tell sellers, dealers and shops across the Philippines exactly what you need to buy or rent.",
      },
    ],
  }),
});

const CATEGORIES = ["car", "motorcycle", "truck", "equipment", "part", "service", "tow", "other"] as const;
const CONTACT = ["platform", "phone", "messenger", "any"] as const;

const schema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(CATEGORIES),
  budget_min_php: z.number().nullable(),
  budget_max_php: z.number().nullable(),
  region: z.string().nullable(),
  city: z.string().trim().max(120).nullable(),
  contact_method: z.enum(CONTACT),
  contact_value: z.string().trim().max(200).nullable(),
});

function NewWantedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "car" as (typeof CATEGORIES)[number],
    budget_min: "",
    budget_max: "",
    region: "",
    city: "",
    contact_method: "platform" as (typeof CONTACT)[number],
    contact_value: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/wanted/new" } as any });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      title: form.title,
      description: form.description,
      category: form.category,
      budget_min_php: form.budget_min ? Number(form.budget_min) : null,
      budget_max_php: form.budget_max ? Number(form.budget_max) : null,
      region: form.region || null,
      city: form.city || null,
      contact_method: form.contact_method,
      contact_value: form.contact_value || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("wanted_posts")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wanted request posted");
    navigate({ to: "/wanted/$id", params: { id: data.id } });
  }

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-12 text-center">Loading…</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link to="/wanted" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to wanted board
          </Link>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold">
            <Megaphone className="h-6 w-6 text-primary" /> Post a wanted request
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Be specific: vehicle/model, year range, budget, location, and how to contact you. Your
            post stays open for 30 days.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              maxLength={140}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Looking for Toyota Vios 2018–2020 under ₱500k"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              required
              rows={5}
              maxLength={4000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Year range, transmission, mileage, must-have docs (OR/CR), trade-in, financing, etc."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as (typeof CATEGORIES)[number] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={form.region || "none"}
                onValueChange={(v) => setForm({ ...form, region: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anywhere in PH" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Anywhere in PH</SelectItem>
                  {PH_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City / municipality</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Cebu City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bmin">Budget min (₱)</Label>
              <Input
                id="bmin"
                type="number"
                min={0}
                value={form.budget_min}
                onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bmax">Budget max (₱)</Label>
              <Input
                id="bmax"
                type="number"
                min={0}
                value={form.budget_max}
                onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preferred contact</Label>
              <Select
                value={form.contact_method}
                onValueChange={(v) =>
                  setForm({ ...form, contact_method: v as (typeof CONTACT)[number] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">365 in-app messages</SelectItem>
                  <SelectItem value="phone">Phone / Viber</SelectItem>
                  <SelectItem value="messenger">Messenger</SelectItem>
                  <SelectItem value="any">Any method</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.contact_method !== "platform" && (
              <div className="space-y-2">
                <Label htmlFor="cv">Contact details (optional)</Label>
                <Input
                  id="cv"
                  value={form.contact_value}
                  onChange={(e) => setForm({ ...form, contact_value: e.target.value })}
                  placeholder="0917…  or  m.me/yourpage"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Stay safe: never send full payment before verifying OR/CR and meeting in person. See our{" "}
            <Link to="/guidelines" className="underline">
              community guidelines
            </Link>
            .
          </div>

          <FormFeedbackLink formId="wanted-new" className="mb-1" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/wanted">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting…" : "Post wanted request"}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
