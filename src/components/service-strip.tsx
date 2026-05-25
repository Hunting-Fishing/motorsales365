import { Wrench, Shield, Banknote, FileText, ClipboardCheck, Sparkles } from "lucide-react";
import { ServiceInquiryDialog, type InquiryType } from "@/components/service-inquiry-dialog";

interface ServiceStripProps {
  listingId: string;
  vehicleSummary: string;
  /** When true, render a compact single-row variant (e.g. in cards). Default false. */
  compact?: boolean;
}

const ACTIONS: { type: InquiryType; label: string; short: string; Icon: typeof Wrench }[] = [
  { type: "inspection", label: "Pre-purchase inspection", short: "Inspection", Icon: Wrench },
  { type: "insurance", label: "Insurance quote", short: "Insurance", Icon: Shield },
  { type: "financing", label: "Financing", short: "Financing", Icon: Banknote },
  { type: "or_cr", label: "OR/CR renewal", short: "OR/CR", Icon: FileText },
  { type: "title_transfer", label: "Title transfer", short: "Title", Icon: ClipboardCheck },
];

/**
 * Above-the-fold horizontal CTA strip prompting buyers to request
 * partner services (inspection, insurance, financing). Drives service-inquiry
 * lead-gen revenue without competing with the primary "Contact seller" CTA.
 */
export function ServiceStrip({ listingId, vehicleSummary, compact = false }: ServiceStripProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {ACTIONS.slice(0, 3).map(({ type, short, Icon }) => (
          <ServiceInquiryDialog
            key={type}
            inquiryType={type}
            listingId={listingId}
            vehicleSummary={vehicleSummary}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {short}
            </button>
          </ServiceInquiryDialog>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-base font-semibold leading-tight sm:text-lg">
            Need inspection or insurance for this car?
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Free quotes from vetted PH partners. One form, no commitment.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ACTIONS.map(({ type, label, Icon }) => (
          <ServiceInquiryDialog
            key={type}
            inquiryType={type}
            listingId={listingId}
            vehicleSummary={vehicleSummary}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          </ServiceInquiryDialog>
        ))}
      </div>
    </div>
  );
}
