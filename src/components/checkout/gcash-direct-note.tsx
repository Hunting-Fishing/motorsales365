import { Smartphone } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Small footer note shown beneath every Stripe checkout, telling buyers
 * they can alternatively send straight to our GCash wallet.
 */
export function GCashDirectNote() {
  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <div className="font-semibold">Prefer GCash direct?</div>
          <p className="text-muted-foreground">
            Send to our GCash wallet{" "}
            <span className="font-mono font-medium text-foreground">+63 969 606 3830</span>{" "}
            (365 MotorSales) and upload your receipt — we confirm within 1 business day.
          </p>
          <Link
            to="/help/pay-with-gcash"
            className="inline-block text-xs font-medium text-primary underline underline-offset-2"
          >
            See the step-by-step guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
