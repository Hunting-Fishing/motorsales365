import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import { Button } from "@/components/ui/button";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const result = await createCheckoutSession({
        data: {
          priceId,
          quantity,
          returnUrl:
            returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("No client secret returned");
      return result.clientSecret;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed to load";
      setError(msg);
      throw e;
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="font-medium text-destructive">Checkout couldn't load</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div id="checkout" className="min-h-[600px]">
      <EmbeddedCheckoutProvider
        key={`${priceId}-${attempt}`}
        stripe={getStripe()}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
