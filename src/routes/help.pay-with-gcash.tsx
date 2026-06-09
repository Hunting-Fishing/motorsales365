import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/help/pay-with-gcash")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: "How to Pay with GCash on 365 Motorsales" },
      {
        name: "description",
        content:
          "Step-by-step guide to paying for listings, boosts, and subscriptions using GCash on 365 Motorsales. Send payment, upload receipt, get confirmed.",
      },
    ],
  }),
});

function GuidePage() {
  const steps = [
    {
      n: 1,
      title: "Pick GCash at checkout",
      body: "On any checkout page, choose 'Pay with a Philippine method' and select GCash.",
    },
    {
      n: 2,
      title: "Send payment",
      body: "Open the GCash app. Scan the QR code shown on the payment page, or send to the account number listed.",
    },
    {
      n: 3,
      title: "Note your reference",
      body: "GCash shows a reference number after a successful send. Copy it — you'll paste it on 365 next.",
    },
    {
      n: 4,
      title: "Upload your receipt",
      body: "Back on 365, paste the reference and upload your GCash receipt screenshot or PDF. Submit for review.",
    },
    {
      n: 5,
      title: "We confirm within 1 business day",
      body: "An admin reviews your proof. You'll get an email once approved and your invoice will be marked PAID.",
    },
  ];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">How to pay with GCash</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paying via GCash on 365 Motorsales is a manual flow that takes about 2 minutes.
      </p>
      <ol className="mt-8 space-y-4">
        {steps.map((s) => (
          <li key={s.n}>
            <Card>
              <CardContent className="flex gap-4 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {s.n}
                </div>
                <div>
                  <div className="font-semibold">{s.title}</div>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/payments">See all payment methods</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/support">Need help?</Link>
        </Button>
      </div>
    </div>
  );
}
