import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site-layout";
import { Loader2, MailMinus, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

type State = "validating" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setState("invalid");
        else if (json.valid) setState("valid");
        else if (json.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        if (!cancelled) setState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm() {
    setState("submitting");
    try {
      const res = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      setState(
        res.ok && json.success
          ? "done"
          : json.reason === "already_unsubscribed"
            ? "already"
            : "error",
      );
    } catch {
      setState("error");
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === "done" || state === "already" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : state === "invalid" || state === "error" ? (
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
              You'll stop receiving marketing and lifecycle emails from 365 MotorSales. Critical
              account and security emails will still be sent.
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
              We won't send you marketing emails anymore. Thanks for letting us know.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="font-display text-3xl font-bold">Already unsubscribed</h1>
            <p className="mt-3 text-muted-foreground">
              This email address has already been unsubscribed.
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="font-display text-3xl font-bold">Invalid link</h1>
            <p className="mt-3 text-muted-foreground">
              This unsubscribe link is invalid or has expired. If you keep receiving emails, reply
              to any of them and we'll remove you manually.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-muted-foreground">Please try again in a moment.</p>
            <Button className="mt-6" variant="outline" onClick={() => location.reload()}>
              Retry
            </Button>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
