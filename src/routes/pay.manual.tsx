import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ManualPayForm } from "@/components/checkout/manual-pay-form";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

type Search = {
  kind?: "listing" | "upgrade" | "boost" | "subscription" | "course";
  ref?: string;
  amount?: number;
  desc?: string;
  method?: string;
};

export const Route = createFileRoute("/pay/manual")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    kind: (s.kind as Search["kind"]) ?? "listing",
    ref: typeof s.ref === "string" ? s.ref : undefined,
    amount: s.amount ? Number(s.amount) : undefined,
    desc: typeof s.desc === "string" ? s.desc : undefined,
    method: typeof s.method === "string" ? s.method : undefined,
  }),
  component: ManualPayPage,
  head: () => ({
    meta: [
      { title: "Pay with GCash, Maya, QR Ph or Bank — 365 Motorsales" },
      {
        name: "description",
        content:
          "Pay for your listing, boost, subscription, or course using GCash, Maya, QR Ph, bank transfer, or PayPal. Upload your receipt and we confirm within 1 business day.",
      },
    ],
  }),
});

function ManualPayPage() {
  const search = useSearch({ from: "/pay/manual" });
  const amount = search.amount ?? 0;
  const isGcash = search.method === "gcash_manual" || search.method === "gcash";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">
        {isGcash ? "Pay with GCash" : "Pay with a Philippine method"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isGcash
          ? "Send the exact amount to our GCash wallet, then upload your receipt below. We confirm within 1 business day."
          : "Choose a method, send payment, then upload your proof. We'll confirm within 1 business day."}
      </p>

      {isGcash && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
            <div className="text-sm">
              <div className="font-semibold">Send to GCash</div>
              <div className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">365 MotorSales</span> — wallet
                details will be provided by admin after you submit your payment request.
              </div>
            </div>
          </div>
        </div>
      )}

      {amount <= 0 ? (
        <Card className="mt-6">
          <CardContent className="p-6 text-sm">
            Missing amount. Please start from your checkout page.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <ManualPayForm
            kind={search.kind ?? "listing"}
            refId={search.ref ?? null}
            amountPhp={amount}
            description={search.desc}
            preselectMethod={isGcash ? "gcash_manual" : search.method}
          />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        New to GCash payments?{" "}
        <a href="/help/pay-with-gcash" className="underline">
          Read the step-by-step guide
        </a>
      </p>
    </div>
  );
}
