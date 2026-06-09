import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ManualPayForm } from "@/components/checkout/manual-pay-form";
import { Card, CardContent } from "@/components/ui/card";

type Search = {
  kind?: "listing" | "upgrade" | "boost" | "subscription" | "course";
  ref?: string;
  amount?: number;
  desc?: string;
};

export const Route = createFileRoute("/pay/manual")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    kind: (s.kind as Search["kind"]) ?? "listing",
    ref: typeof s.ref === "string" ? s.ref : undefined,
    amount: s.amount ? Number(s.amount) : undefined,
    desc: typeof s.desc === "string" ? s.desc : undefined,
  }),
  component: ManualPayPage,
  head: () => ({
    meta: [
      { title: "Pay with GCash, Maya, QR Ph or Bank — 365 Motorsales" },
      {
        name: "description",
        content:
          "Pay for your listing, boost, subscription, or course using GCash, Maya, QR Ph, bank transfer, or PayPal. Upload your receipt and we'll confirm within 1 business day.",
      },
    ],
  }),
});

function ManualPayPage() {
  const search = useSearch({ from: "/pay/manual" });
  const amount = search.amount ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Pay with a Philippine method</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a method, send payment, then upload your proof. We'll confirm within 1 business day.
      </p>

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
