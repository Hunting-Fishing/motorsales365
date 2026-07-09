import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  getMyApplication,
  postApplicationMessage,
  createFranchiseCheckoutSession,
  listActiveTiers,
} from "@/lib/franchise.functions";
import { ApplicationAuditTrail } from "@/components/franchise/ApplicationAuditTrail";

export const Route = createFileRoute("/_authenticated/franchise/status")({
  head: () => ({
    meta: [
      { title: "My Franchise Application — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  in_review: "In review",
  info_requested: "More info requested",
  approved: "Approved — complete payment",
  rejected: "Not approved",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_review: "secondary",
  info_requested: "outline",
  approved: "default",
  rejected: "destructive",
};

function StatusPage() {
  const getFn = useServerFn(getMyApplication);
  const postFn = useServerFn(postApplicationMessage);
  const tiersFn = useServerFn(listActiveTiers);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["franchise", "my-app"],
    queryFn: () => getFn(),
  });
  const tiers = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => tiersFn(),
  });
  const [body, setBody] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      if (!data?.application) return;
      await postFn({ data: { applicationId: data.application.id, body } });
    },
    onSuccess: () => {
      setBody("");
      toast.success("Message sent");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send"),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  }

  if (!data?.application) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">No application yet</h1>
          <p className="mt-2 text-muted-foreground">
            You haven't submitted a Franchise or Partner application. Apply to join the 365 network.
          </p>
          <Button asChild className="mt-6">
            <Link to="/franchise/apply" search={{ tier: "partner" } as any}>
              Apply now
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const app = data.application;
  const membership = data.membership;
  const pending = membership?.status === "pending_payment";
  const tierSlug = membership?.pending_tier_slug ?? membership?.tier_slug ?? app.tier_slug;
  const tier = tiers.data?.find((t) => t.slug === tierSlug);

  return (
    <SiteLayout>
      {pending ? <PaymentTestModeBanner /> : null}
      <section className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/franchise" className="text-sm text-muted-foreground hover:text-foreground">
          ← Franchise &amp; Partner Program
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">My application</h1>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(app.created_at).toLocaleDateString()} · {app.business_name}
        </p>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={STATUS_VARIANT[app.status]} className="mt-1 text-sm">
                {STATUS_LABEL[app.status] ?? app.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applying for</p>
              <p className="font-semibold">
                {tierSlug === "franchise" ? "365 Franchise" : "365 Partner"}
              </p>
            </div>
          </div>

          {app.reviewer_notes ? (
            <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-sm">
              <p className="font-medium">Note from reviewer</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{app.reviewer_notes}</p>
            </div>
          ) : null}
        </Card>

        {pending && membership ? (
          <Card className="mt-6 border-primary p-6">
            <h2 className="font-display text-xl font-semibold">Complete your membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You're approved as {tier?.name ?? "a 365 partner"}. Complete the setup + first month
              payment to activate your benefits.
            </p>
            {tier ? (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>
                  • Monthly fee: <strong>₱{(tier.monthly_fee_cents / 100).toLocaleString()}</strong>
                </li>
                {tier.setup_fee_cents > 0 ? (
                  <li>
                    • One-time setup:{" "}
                    <strong>₱{(tier.setup_fee_cents / 100).toLocaleString()}</strong>
                  </li>
                ) : null}
                <li>• Parts discount: {(tier.parts_discount_bps / 100).toFixed(0)}%</li>
                <li>• Ad discount: {(tier.ad_discount_bps / 100).toFixed(0)}%</li>
              </ul>
            ) : null}
            {!payOpen ? (
              <Button className="mt-4" onClick={() => setPayOpen(true)}>
                Complete payment
              </Button>
            ) : (
              <MembershipCheckout membershipId={membership.id} />
            )}
          </Card>
        ) : null}

        {membership && membership.status === "active" ? (
          <Card className="mt-6 border-primary p-6">
            <h2 className="font-display text-xl font-semibold">You're in.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Member number <strong>{membership.member_number}</strong>
            </p>
            {membership.ad_discount_code ? (
              <p className="mt-2 text-sm">
                Advertising discount code:{" "}
                <code className="rounded bg-secondary px-2 py-1">
                  {membership.ad_discount_code}
                </code>
              </p>
            ) : null}
            <Button asChild className="mt-4">
              <Link to="/franchise/dashboard">Open partner dashboard</Link>
            </Button>
          </Card>
        ) : null}

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Review history</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every action a reviewer takes on your application appears here.
          </p>
          <div className="mt-4">
            <ApplicationAuditTrail applicationId={app.id} showActor={false} />
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Messages</h2>
          <div className="mt-3 space-y-3">
            {data.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              data.messages.map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 space-y-2">
            <Textarea
              rows={3}
              placeholder="Reply to the reviewer…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button
              onClick={() => send.mutate()}
              disabled={!body.trim() || send.isPending}
              size="sm"
            >
              {send.isPending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}

function MembershipCheckout({ membershipId }: { membershipId: string }) {
  const checkoutFn = useServerFn(createFranchiseCheckoutSession);
  const fetchClientSecret = async (): Promise<string> => {
    const result = await checkoutFn({
      data: {
        membershipId,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="franchise-checkout" className="mt-4">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
