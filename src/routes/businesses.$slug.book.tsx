import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessPage } from "@/lib/business-pages.functions";
import { getBookingConfig, createBooking } from "@/lib/business-bookings.functions";
import { computeSlots } from "@/lib/business-bookings-slots";

export const Route = createFileRoute("/businesses/$slug/book")({
  head: ({ params }) => ({
    meta: [
      { title: "Book an appointment — 365 MotorSales Philippines" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://www.365motorsales.com/businesses/${params.slug}/book` }],
  }),
  component: BookingPage,
});

function peso(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BookingPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchPage = useServerFn(getBusinessPage);
  const fetchConfig = useServerFn(getBookingConfig);
  const submit = useServerFn(createBooking);

  const { data: pageData } = useQuery({
    queryKey: ["business-page", slug],
    queryFn: () => fetchPage({ data: { slug } }),
  });
  const biz: any = pageData?.business;

  const { data: cfg } = useQuery({
    queryKey: ["booking-config", biz?.id],
    queryFn: () => fetchConfig({ data: { businessId: biz.id, horizonDays: 30 } }),
    enabled: !!biz?.id,
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState((user as any)?.user_metadata?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState((user as any)?.email ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ status: string; startsAt: string } | null>(null);

  const item = useMemo(
    () => (cfg?.items ?? []).find((i: any) => i.id === selectedItemId) ?? null,
    [cfg, selectedItemId],
  );

  const slots = useMemo(() => {
    if (!item || !selectedDate || !cfg) return [];
    return computeSlots({
      date: toLocalDateString(selectedDate),
      itemDurationMin: item.duration_min,
      itemBufferMin: item.buffer_min ?? 0,
      maxConcurrent: item.max_concurrent ?? 1,
      itemId: item.id,
      availability: cfg.availability as any,
      exceptions: cfg.exceptions as any,
      bookings: cfg.bookings as any,
      leadTimeHours: item.lead_time_hours ?? 2,
    });
  }, [item, selectedDate, cfg]);

  if (!biz) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  }

  if (confirmed) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-xl px-4 py-12">
          <Card className="p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h1 className="font-display text-2xl font-semibold">
              {confirmed.status === "confirmed" ? "Booking confirmed" : "Booking request sent"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmed.status === "confirmed"
                ? `Your appointment with ${biz.name} is booked for `
                : `${biz.name} will review your request for `}
              <strong>{new Date(confirmed.startsAt).toLocaleString()}</strong>.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/businesses/$slug" params={{ slug }}>
                <Button variant="outline">Back to {biz.name}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  const items = cfg?.items ?? [];

  async function handleSubmit() {
    if (!item || !selectedSlot) return;
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.error("Please provide a phone or email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          businessId: biz.id,
          bookableItemId: item.id,
          startsAt: selectedSlot,
          customerName: name.trim(),
          customerPhone: phone.trim() || null,
          customerEmail: email.trim() || null,
          userId: (user as any)?.id ?? null,
          notes: notes.trim() || null,
        },
      });
      setConfirmed({
        status: (res as any).booking.status,
        startsAt: (res as any).booking.starts_at,
      });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't create booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Link
          to="/businesses/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to {biz.name}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold">Book an appointment</h1>
        <p className="text-sm text-muted-foreground">at {biz.name}</p>

        {items.length === 0 && (
          <Card className="mt-6 p-5 text-sm text-muted-foreground">
            No bookable services available right now.
          </Card>
        )}

        {items.length > 0 && (
          <>
            {/* STEP 1: service */}
            <Card className="mt-6 p-5">
              <h2 className="mb-3 font-display text-base font-semibold">1. Choose a service</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((it: any) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(it.id);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      selectedItemId === it.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="font-medium">{it.title}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{it.duration_min} min</span>
                      {it.price_php != null && (
                        <span className="font-semibold text-foreground">{peso(it.price_php)}</span>
                      )}
                    </div>
                    {it.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {it.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* STEP 2: date */}
            {item && (
              <Card className="mt-4 p-5">
                <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                  <CalendarIcon className="h-4 w-4" /> 2. Pick a date
                </h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const max = new Date();
                    max.setDate(max.getDate() + (item.horizon_days ?? 30));
                    return date < today || date > max;
                  }}
                  className={cn("pointer-events-auto rounded-md border p-3")}
                />
              </Card>
            )}

            {/* STEP 3: slot */}
            {item && selectedDate && (
              <Card className="mt-4 p-5">
                <h2 className="mb-3 font-display text-base font-semibold">3. Choose a time</h2>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No times available on this date. Pick another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {slots.map((s) => (
                      <button
                        key={s.startsAtIso}
                        type="button"
                        onClick={() => setSelectedSlot(s.startsAtIso)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-sm transition-colors",
                          selectedSlot === s.startsAtIso
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* STEP 4: contact */}
            {item && selectedSlot && (
              <Card className="mt-4 p-5">
                <h2 className="mb-3 font-display text-base font-semibold">4. Your details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="b-name">Full name</Label>
                    <Input
                      id="b-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label htmlFor="b-phone">Phone</Label>
                    <Input
                      id="b-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={40}
                      placeholder="+63…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="b-email">Email</Label>
                    <Input
                      id="b-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="b-notes">Notes (optional)</Label>
                    <Textarea
                      id="b-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                  </div>
                </div>
                <FormFeedbackLink formId="business-booking" className="mt-3" />
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {item.title} · {new Date(selectedSlot).toLocaleString()}
                    {item.require_approval ? " · Awaits owner approval" : " · Auto-confirms"}
                  </div>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting
                      ? "Submitting…"
                      : item.require_approval
                        ? "Request booking"
                        : "Confirm booking"}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
