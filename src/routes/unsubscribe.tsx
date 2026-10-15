import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site-layout";
import { Loader2, MailMinus, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

type State =
  | "validating"
  | "valid"
  | "already"
  | "invalid"
  | "consumed"
  | "submitting"
  | "done"
  | "error";

function failedRequestState(status: number): "invalid" | "consumed" | "error" {
  if (status === 409) return "consumed";
  return status === 400 || status === 404 ? "invalid" : "error";
}

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>("validating");
  const requestEpoch = useRef<symbol | null>(null);

  useEffect(() => {
    const epoch = Symbol();
    requestEpoch.current = epoch;
    if (!token) {
      setState("invalid");
    } else {
      setState("validating");
      void (async () => {
        try {
          const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
          const json = await res.json();
          if (epoch !== requestEpoch.current) return;
          if (!res.ok) setState(failedRequestState(res.status));
          else if (json.valid === true) setState("valid");
          else if (json.reason === "already_unsubscribed") setState("already");
          else setState("error");
        } catch {
          if (epoch === requestEpoch.current) setState("error");
        }
      })();
    }
    return () => {
      // Also invalidate a POST started after this GET. Token changes and
      // unmount must never let an older response replace the current outcome.
      requestEpoch.current = null;
    };
  }, [token]);

  async function confirm() {
    const epoch = Symbol();
    requestEpoch.current = epoch;
    setState("submitting");
    try {
      const res = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (epoch !== requestEpoch.current) return;
      setState(
        !res.ok
          ? failedRequestState(res.status)
          : json.success === true
            ? "done"
            : json.reason === "already_unsubscribed"
              ? "already"
              : "error",
      );
    } catch {
      if (epoch === requestEpoch.current) setState("error");
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === "done" || state === "already" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : state === "invalid" || state === "consumed" || state === "error" ? (
            <XCircle className="h-7 w-7" />
          ) : state === "validating" || state === "submitting" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <MailMinus className="h-7 w-7" />
          )}
        </div>

        {state === "validating" && (
          <p className="text-muted-foreground">Checking your unsubscribe link…</p>
        )}

        {state === "valid" && (
          <>
            <h1 className="font-display text-3xl font-bold">Unsubscribe from emails</h1>
            <p className="mt-3 text-muted-foreground">
              Request a marketing opt-out for this email address. Critical account and security
              messages are handled separately.
            </p>
            <Button className="mt-8" size="lg" onClick={confirm}>
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state === "submitting" && <p className="text-muted-foreground">Processing…</p>}

        {state === "done" && (
          <>
            <h1 className="font-display text-3xl font-bold">You're unsubscribed</h1>
            <p className="mt-3 text-muted-foreground">
              Your marketing opt-out has been recorded. Critical account and security messages are
              handled separately.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="font-display text-3xl font-bold">Already unsubscribed</h1>
            <p className="mt-3 text-muted-foreground">
              A marketing opt-out is already recorded for this email address.
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="font-display text-3xl font-bold">Invalid link</h1>
            <p className="mt-3 text-muted-foreground">
              This unsubscribe link is invalid or has expired. Use a newer unsubscribe link or
              contact 365 MotorSales support if you need help with your email preferences.
            </p>
            <a className="mt-6 underline" href="/contact">
              Contact support
            </a>
          </>
        )}

        {state === "consumed" && (
          <>
            <h1 className="font-display text-3xl font-bold">This link has already been used</h1>
            <p className="mt-3 text-muted-foreground">
              We cannot confirm your current email preferences from this link. Use a newer
              unsubscribe link or contact 365 MotorSales support. This used-token request has not
              reapplied suppression.
            </p>
            <a className="mt-6 underline" href="/contact">
              Contact support
            </a>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="font-display text-3xl font-bold">
              We couldn't confirm your email preferences
            </h1>
            <p className="mt-3 text-muted-foreground">
              The request could not be confirmed. Please try again in a moment or contact support.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => location.reload()}>
              Retry
            </Button>
            <a className="mt-4 underline" href="/contact">
              Contact support
            </a>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
