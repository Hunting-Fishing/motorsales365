import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { listExportListings, submitExportInquiry } from "@/lib/export-brokerage.functions";
import { toast } from "sonner";
import { Ship, Globe, ShieldCheck, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/export")({
  component: ExportPage,
  head: () => ({
    meta: [
      { title: "365 Export — International vehicle brokerage from the Philippines" },
      {
        name: "description",
        content:
          "Buy verified vehicles from the Philippines, shipped to your port. Brokerage, inspection, and documentation handled end-to-end.",
      },
    ],
  }),
});

function ExportPage() {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["export-listings", search],
    queryFn: () => listExportListings({ data: { search: search || undefined, limit: 24 } }),
  });
  const listings = data?.listings ?? [];

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">New division</Badge>
            <h1 className="font-display text-4xl md:text-6xl tracking-tight">365 Export</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              International brokerage for vehicles sourced in the Philippines. We handle inspection,
              documentation, and shipping — you receive the vehicle at your port.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <a href="#catalog">
                <Button size="lg">Browse export-ready vehicles</Button>
              </a>
              <a href="#inquiry">
                <Button size="lg" variant="outline">
                  Request a quote
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <AdCarousel placement="export_top" className="mb-10" />

        <div className="grid gap-6 md:grid-cols-4">
          {[
            {
              Icon: ShieldCheck,
              t: "Verified sellers only",
              d: "Every export-ready unit comes from a verified seller on 365 MotorSales.",
            },
            {
              Icon: FileCheck2,
              t: "Full documentation",
              d: "Deregistration, export permits, bill of lading — handled by our brokers.",
            },
            {
              Icon: Ship,
              t: "Door-to-port shipping",
              d: "RoRo and container options to major ports worldwide.",
            },
            {
              Icon: Globe,
              t: "Pay in your currency",
              d: "Quotes in USD/JPY/EUR. Escrow via international wire.",
            },
          ].map(({ Icon, t, d }) => (
            <Card key={t}>
              <CardContent className="p-5">
                <Icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="catalog" className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Export-ready catalog</h2>
            <p className="text-sm text-muted-foreground">
              Vehicles flagged by verified sellers as available for international export.
            </p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search make / model"
            className="max-w-xs"
          />
        </div>
        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No export-ready listings yet. Submit an inquiry below and we'll source one for you.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => {
              const attrs = (l.attributes ?? {}) as Record<string, any>;
              const cover =
                attrs.cover_url || (Array.isArray(attrs.photos) ? attrs.photos[0] : "") || "";
              return (
                <Link
                  key={l.id}
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="group block overflow-hidden rounded-lg border bg-card hover:shadow-md transition"
                >
                  <ImageWithSkeleton
                    src={cover}
                    alt={l.title}
                    className="aspect-[4/3] w-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                  <div className="p-3">
                    <p className="font-medium line-clamp-1">{l.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {[attrs.year, attrs.make, attrs.model].filter(Boolean).join(" ")}
                    </p>
                    <p className="mt-1 text-sm">{l.region}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="inquiry" className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-2xl">Request an export quote</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what you're looking for. A broker will reply within 1–2 business days.
            </p>
            <ExportInquiryForm />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ExportInquiryForm() {
  const [form, setForm] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    country: "",
    destination_port: "",
    vehicle_interest: "",
    budget_usd: "",
    message: "",
  });
  const mut = useMutation({
    mutationFn: () =>
      submitExportInquiry({
        data: {
          buyer_name: form.buyer_name,
          buyer_email: form.buyer_email,
          buyer_phone: form.buyer_phone || undefined,
          country: form.country,
          destination_port: form.destination_port || undefined,
          vehicle_interest: form.vehicle_interest || undefined,
          budget_usd: form.budget_usd ? Number(form.budget_usd) : undefined,
          message: form.message,
        },
      }),
    onSuccess: () => {
      toast.success("Inquiry sent. Our team will be in touch shortly.");
      setForm({
        buyer_name: "",
        buyer_email: "",
        buyer_phone: "",
        country: "",
        destination_port: "",
        vehicle_interest: "",
        budget_usd: "",
        message: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="bn">Your name *</Label>
          <Input id="bn" required value={form.buyer_name} onChange={set("buyer_name")} />
        </div>
        <div>
          <Label htmlFor="be">Email *</Label>
          <Input
            id="be"
            type="email"
            required
            value={form.buyer_email}
            onChange={set("buyer_email")}
          />
        </div>
        <div>
          <Label htmlFor="bp">Phone / WhatsApp</Label>
          <Input id="bp" value={form.buyer_phone} onChange={set("buyer_phone")} />
        </div>
        <div>
          <Label htmlFor="bc">Country *</Label>
          <Input id="bc" required value={form.country} onChange={set("country")} />
        </div>
        <div>
          <Label htmlFor="bport">Destination port</Label>
          <Input
            id="bport"
            placeholder="e.g. Mombasa, Yokohama"
            value={form.destination_port}
            onChange={set("destination_port")}
          />
        </div>
        <div>
          <Label htmlFor="bud">Budget (USD)</Label>
          <Input
            id="bud"
            type="number"
            min={0}
            value={form.budget_usd}
            onChange={set("budget_usd")}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="vi">Vehicle of interest</Label>
        <Input
          id="vi"
          placeholder="Make / model / year range"
          value={form.vehicle_interest}
          onChange={set("vehicle_interest")}
        />
      </div>
      <div>
        <Label htmlFor="msg">Message *</Label>
        <Textarea
          id="msg"
          required
          rows={5}
          value={form.message}
          onChange={set("message")}
          placeholder="Tell us about your requirements, quantity, timeline..."
        />
      </div>
      <Button type="submit" size="lg" disabled={mut.isPending}>
        {mut.isPending ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
