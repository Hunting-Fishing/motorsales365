import { useState } from "react";
import { toast } from "sonner";
import { Shield, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { useAuth } from "@/hooks/use-auth";
import { submitQuoteRequest } from "@/lib/quote-requests.functions";

interface Props {
  listingId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  region?: string;
  budgetPhp?: number;
}

export function QuoteRequestCta(props: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-sky-950/30 dark:to-emerald-950/30">
      <QuoteDialog kind="insurance" {...props}>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Shield className="h-4 w-4 text-sky-500" />
          Insurance quote
        </Button>
      </QuoteDialog>
      <QuoteDialog kind="financing" {...props}>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Banknote className="h-4 w-4 text-emerald-500" />
          Get financing
        </Button>
      </QuoteDialog>
    </div>
  );
}

function QuoteDialog({
  children,
  kind,
  ...defaults
}: Props & { children: React.ReactNode; kind: "insurance" | "financing" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
    notes: "",
  });

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to request a quote.");
      return;
    }
    if (!form.contactName) {
      toast.error("Please enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      await submitQuoteRequest({
        data: {
          kind,
          listingId: defaults.listingId,
          vehicleMake: defaults.vehicleMake,
          vehicleModel: defaults.vehicleModel,
          vehicleYear: defaults.vehicleYear,
          region: defaults.region,
          budgetPhp: defaults.budgetPhp,
          contactName: form.contactName,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          notes: form.notes || undefined,
        },
      });
      toast.success(
        kind === "insurance"
          ? "Quote request sent. Insurance partners will reach out shortly."
          : "Financing request sent. Lenders will contact you shortly.",
      );
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "insurance" ? "Get an insurance quote" : "Get financing options"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            We'll share your request with vetted{" "}
            {kind === "insurance" ? "insurance providers" : "lenders"} on our platform. Expect a response within 1–2 business days.
          </p>
          <div>
            <Label>Your name *</Label>
            <Input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={
                kind === "insurance"
                  ? "Coverage preferences, current policy details, etc."
                  : "Down payment, monthly budget, term preference, etc."
              }
            />
          </div>
        </div>
        <div className="pt-1"><FormFeedbackLink formId="quote-request" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
