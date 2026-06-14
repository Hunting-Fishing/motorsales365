/**
 * SYNC GROUP: inspection-services
 * Source of truth: .lovable/sync-groups.md#inspection-services
 * Siblings: src/lib/inspection.functions.ts
 * Public rate card + request form for inspection / transaction-safety upsells (audit #20).
 * VERSION: 1
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileCheck2,
  IdCard,
  Wrench,
  CalendarCheck,
  FileText,
  HandshakeIcon,
  ShieldCheck,
  Info,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/hooks/use-auth";
import { formatPHP, PH_REGIONS } from "@/lib/format";
import {
  listInspectionServices,
  createInspectionOrder,
} from "@/lib/inspection.functions";

const TITLE = "Inspection & transaction-safety services — 365 MotorSales";
const DESCRIPTION =
  "Optional document review, ID verification, pre-purchase mechanic inspection, vehicle history reports, and transaction assistance for PH car & motorcycle buyers.";
const URL = "https://www.365motorsales.com/services/inspection";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  or_cr_review: FileCheck2,
  id_verify: IdCard,
  prepurchase: Wrench,
  history_report: FileText,
  transaction_assist: HandshakeIcon,
};

const searchSchema = z.object({
  service: z.string().optional(),
  listing: z.string().uuid().optional(),
});

export const Route = createFileRoute("/services/inspection")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: InspectionPage,
});

function priceLabel(min: number, max: number | null, unit: string) {
  if (unit === "commission") return "Free for buyer";
  if (unit === "percent") return "% of sale (custom)";
  if (!max || max === min) return min === 0 ? "Custom" : formatPHP(min);
  return `${formatPHP(min)}–${formatPHP(max)}`;
}

function InspectionPage() {
  const { service: presetService, listing: presetListing } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["inspection-services"],
    queryFn: () => listInspectionServices(),
  });

  const create = useServerFn(createInspectionOrder);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    service_slug: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    vehicle_summary: "",
    region: "",
    preferred_date: "",
    notes: "",
  });

  useEffect(() => {
    if (presetService && !form.service_slug) {
      setForm((f) => ({ ...f, service_slug: presetService }));
      setTimeout(() => {
        document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [presetService, form.service_slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: `/services/inspection?service=${form.service_slug}` } as any,
      });
      return;
    }
    if (!form.service_slug) {
      toast.error("Pick a service first.");
      return;
    }
    if (!form.contact_name || !form.contact_email) {
      toast.error("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await create({
        data: {
          service_slug: form.service_slug,
          listing_id: presetListing ?? null,
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          vehicle_summary: form.vehicle_summary.trim() || null,
          region: form.region || null,
          preferred_date: form.preferred_date || null,
          notes: form.notes.trim() || null,
        },
      });
      toast.success("Request received — we'll email you within 1 business day.");
      setForm({
        service_slug: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        vehicle_summary: "",
        region: "",
        preferred_date: "",
        notes: "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Optional buyer-safety add-ons
          </Badge>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Inspection & transaction-safety services
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Before you hand over money, get a second pair of eyes on the paperwork, the vehicle, and
            the payment hand-off. Pricing below is the buyer-visible PHP range — final fees are
            confirmed before any work starts.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-3 py-1">
              Pay only after you confirm the quote
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1">
              Refund policy applies —{" "}
              <Link to="/refund-policy" className="underline">
                see details
              </Link>
            </span>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-2xl font-semibold">Service rate card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicative buyer-visible prices in Philippine pesos. 365 is not an escrow agent — see{" "}
          <Link to="/terms" className="underline">
            Terms §services
          </Link>
          .
        </p>

        {isLoading ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading services…
          </div>
        ) : services.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No services available right now.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {services.map((s: any) => {
              const Icon = ICONS[s.category] || CalendarCheck;
              return (
                <article
                  key={s.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold leading-tight">
                        {s.name}
                      </h3>
                      <p className="mt-0.5 text-sm font-medium text-primary">
                        {priceLabel(s.price_php_min, s.price_php_max, s.pricing_unit)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
                  <div className="mt-auto pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setForm((f) => ({ ...f, service_slug: s.slug }));
                        document
                          .getElementById("request-form")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Request this service
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="request-form" className="border-t border-border bg-muted/30">
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <h2 className="font-display text-2xl font-semibold">Request a service</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us what you need and we'll come back with a firm quote, partner match, and
            scheduling within one business day.
          </p>

          {!authLoading && !user && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
              <Info className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                You'll be asked to sign in before submitting so we can email you the quote and keep
                your request in your dashboard.{" "}
                <Link to="/login" className="font-medium underline">
                  Sign in
                </Link>{" "}
                or{" "}
                <Link to="/signup" className="font-medium underline">
                  create an account
                </Link>
                .
              </div>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="service">Service *</Label>
              <Select
                value={form.service_slug}
                onValueChange={(v) => setForm((f) => ({ ...f, service_slug: v }))}
              >
                <SelectTrigger id="service" className="mt-1">
                  <SelectValue placeholder="Pick a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s: any) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact_name">Your name *</Label>
                <Input
                  id="contact_name"
                  required
                  value={form.contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone (optional)</Label>
                <Input
                  id="contact_phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Select
                  value={form.region}
                  onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}
                >
                  <SelectTrigger id="region" className="mt-1">
                    <SelectValue placeholder="Where is the vehicle?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PH_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="vehicle_summary">Vehicle summary</Label>
              <Input
                id="vehicle_summary"
                placeholder="e.g. 2018 Toyota Vios 1.3 E, in Quezon City"
                value={form.vehicle_summary}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_summary: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="preferred_date">Preferred date (optional)</Label>
              <Input
                id="preferred_date"
                type="date"
                value={form.preferred_date}
                onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Anything specific you'd like the inspector or reviewer to check"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1"
              />
            </div>

            {presetListing && (
              <p className="text-xs text-muted-foreground">
                Linked to listing{" "}
                <Link
                  to="/listing/$id"
                  params={{ id: presetListing }}
                  className="underline"
                >
                  {presetListing.slice(0, 8)}…
                </Link>
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : user ? "Submit request" : "Sign in & submit"}
            </Button>

            <p className="text-xs text-muted-foreground">
              By submitting you agree to our{" "}
              <Link to="/terms" className="underline">
                Terms
              </Link>{" "}
              and acknowledge that pricing is indicative until a partner confirms.
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
