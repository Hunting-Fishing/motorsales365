import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createServiceInquiry } from "@/lib/service-inquiries.functions";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";

export type InquiryType =
  | "financing"
  | "insurance"
  | "or_cr"
  | "title_transfer"
  | "inspection"
  | "towing"
  | "other";

const COPY: Record<
  InquiryType,
  { title: string; description: string; cta: string; messagePlaceholder: string }
> = {
  financing: {
    title: "Get financing for this vehicle",
    description:
      "Tell us what monthly payment works for you and we'll connect you with a partner lender. No commitment.",
    cta: "Request financing",
    messagePlaceholder: "Target monthly payment, downpayment, employment type…",
  },
  insurance: {
    title: "Get an insurance quote",
    description:
      "Compulsory (CTPL), comprehensive, or commercial coverage — we'll route you to a partner agent.",
    cta: "Request insurance quote",
    messagePlaceholder: "Coverage type, current renewal date, anything else we should know…",
  },
  or_cr: {
    title: "OR/CR renewal help",
    description: "LTO runner services and renewal checklists handled by a vetted partner.",
    cta: "Request OR/CR help",
    messagePlaceholder: "Renewal year, plate number, region…",
  },
  title_transfer: {
    title: "Title transfer assistance",
    description:
      "We'll connect you with a partner who handles ownership transfer paperwork end-to-end.",
    cta: "Request title transfer help",
    messagePlaceholder: "Buyer/seller location, current title status…",
  },
  inspection: {
    title: "Request a vehicle inspection",
    description:
      "Independent inspection from a partner mechanic before you buy. Get a written report.",
    cta: "Request inspection",
    messagePlaceholder: "Preferred date, inspection location, specific concerns…",
  },
  towing: {
    title: "Request towing or transport",
    description: "Get matched with a nearby tow provider and a price quote.",
    cta: "Request a tow",
    messagePlaceholder: "Pickup and drop-off locations, vehicle condition…",
  },
  other: {
    title: "Talk to our team",
    description: "Tell us what you need — we'll get back to you within one business day.",
    cta: "Send inquiry",
    messagePlaceholder: "What can we help you with?",
  },
};

interface Props {
  inquiryType: InquiryType;
  listingId?: string;
  vehicleSummary?: string;
  /** Trigger element. If omitted, an outline button with the default CTA is rendered. */
  children?: React.ReactNode;
}

export function ServiceInquiryDialog({ inquiryType, listingId, vehicleSummary, children }: Props) {
  const { user } = useAuth();
  const copy = COPY[inquiryType];
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    email: user?.email ?? "",
    phone: "",
    message: "",
  });
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createServiceInquiry({
        data: {
          inquiryType,
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
          vehicleSummary: vehicleSummary,
          listingId,
          userId: user?.id,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      toast.success("Got it! A partner will reach out shortly.");
      setOpen(false);
      setForm({
        contactName: "",
        email: user?.email ?? "",
        phone: "",
        message: "",
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" className="w-full">
            {copy.cta}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {vehicleSummary && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              For: <span className="font-medium text-foreground">{vehicleSummary}</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="si-name">Your name</Label>
              <Input
                id="si-name"
                required
                maxLength={100}
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="si-email">Email</Label>
              <Input
                id="si-email"
                type="email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="si-phone">Phone (optional)</Label>
            <PhoneInput
              id="si-phone"
              iso={phoneIso}
              national={phoneNational}
              onChange={({ iso, national }) => {
                setPhoneIso(iso);
                setPhoneNational(national);
                setForm((f) => ({ ...f, phone: buildE164(iso, national) ?? "" }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="si-message">Message</Label>
            <Textarea
              id="si-message"
              rows={4}
              maxLength={2000}
              placeholder={copy.messagePlaceholder}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
          <div className="pt-1"><FormFeedbackLink formId="service-inquiry" /></div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {copy.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
