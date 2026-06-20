import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const INTEREST_OPTIONS: { value: string; label: string }[] = [
  { value: "buying_vehicle", label: "Looking to buy a vehicle" },
  { value: "selling_vehicle", label: "Looking to sell a vehicle" },
  { value: "business_listing", label: "List my business / shop" },
  { value: "parts", label: "Need parts or accessories" },
  { value: "services", label: "Need a motor service (tow, repair, etc.)" },
  { value: "other", label: "Something else" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  contact: z
    .string()
    .trim()
    .min(3, "Add an email or phone number so we can reach you")
    .max(200),
  interest_type: z.enum([
    "buying_vehicle",
    "selling_vehicle",
    "business_listing",
    "parts",
    "services",
    "other",
  ]),
  interest_detail: z.string().trim().max(2000).optional(),
});

export function QrLeadForm({
  referralCode,
  visitorId,
}: {
  referralCode: string;
  visitorId?: string | null;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [interestType, setInterestType] = useState<string>("buying_vehicle");
  const [interestDetail, setInterestDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      contact,
      interest_type: interestType,
      interest_detail: interestDetail || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      const landing =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${window.location.search}`
          : null;
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const { error } = await supabase.from("qr_lead_captures").insert({
        referral_code: referralCode,
        name: parsed.data.name,
        contact: parsed.data.contact,
        interest_type: parsed.data.interest_type,
        interest_detail: parsed.data.interest_detail ?? null,
        visitor_id: visitorId ?? null,
        user_agent: ua,
        landing_url: landing,
      });
      if (error) throw error;
      setDone(true);
      toast.success("Thanks — we'll be in touch shortly.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h3 className="font-display mt-3 text-xl font-bold sm:text-2xl">
          You're on the list
        </h3>
        <p className="mt-2 text-muted-foreground">
          Our team will reach out to you using the contact you provided. In the meantime, feel
          free to browse the marketplace.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Talk to a real person
        </p>
        <h3 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
          Tell us what you're looking for — we'll help.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop your name and best contact. No signup needed. A 365 team member will follow up.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="qrlead-name">Your name</Label>
          <Input
            id="qrlead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="name"
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="qrlead-contact">Email or phone</Label>
          <Input
            id="qrlead-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={200}
            placeholder="you@example.com or 09xx xxx xxxx"
            autoComplete="email"
            required
            className="mt-1.5"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="qrlead-interest">I'm interested in</Label>
          <Select value={interestType} onValueChange={setInterestType}>
            <SelectTrigger id="qrlead-interest" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="qrlead-detail">
            Vehicle or business details{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="qrlead-detail"
            value={interestDetail}
            onChange={(e) => setInterestDetail(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="e.g. 2018 Toyota Hilux under ₱900k in Cebu, or 'Tire shop in Pasig, want a free business page'"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending…" : (
            <>
              Send to 365 team <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          We'll only use your contact to follow up on this request.
        </p>
      </div>
    </form>
  );
}
