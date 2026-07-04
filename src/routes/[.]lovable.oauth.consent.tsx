import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
function oauth() {
  return (supabase as unknown as {
    auth: {
      oauth: {
        getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
        approveAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
        denyAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
      };
    };
  }).auth.oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return data;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <main className="container mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Authorization error</h1>
        <p className="mt-2 text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </main>
    </SiteLayout>
  ),
});

function scopeLabel(scope: string) {
  const map: Record<string, string> = {
    openid: "Verify your 365 MotorSales identity",
    email: "See your email address",
    profile: "See your basic profile",
  };
  return map[scope] ?? `Additional permission: ${scope}`;
}

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "openid email profile").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <SiteLayout>
      <main className="container mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold">
            Connect {clientName} to 365 MotorSales
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This lets {clientName} use 365 MotorSales as you while you're signed in.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What {clientName} will be able to do
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {scopes.map((s: string) => (
                <li key={s}>• {scopeLabel(s)}</li>
              ))}
              <li>• Call this app's enabled tools (search listings, list your listings)</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              This does not bypass 365 MotorSales permissions or backend policies.
            </p>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? "Working…" : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={() => decide(false)}
              disabled={busy}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}
