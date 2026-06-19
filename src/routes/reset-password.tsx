import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

type ResetState =
  | "verifying"   // exchanging token in URL
  | "request"     // no token; ask user to request a link
  | "set"         // valid session; show new password form
  | "updating"    // updateUser in flight
  | "success"     // password updated; redirecting
  | "expired"     // token expired
  | "invalid";    // token invalid / already used

function classifyAuthError(message: string): "expired" | "invalid" {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("otp_expired")) return "expired";
  return "invalid";
}

function ResetPasswordPage() {
  const [state, setState] = useState<ResetState>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Token exchange on mount ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const hash = window.location.hash || "";
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const errorDesc =
      url.searchParams.get("error_description") ||
      hash.match(/error_description=([^&]+)/)?.[1];

    // Error returned in URL (Supabase redirects with ?error_description=…)
    if (errorDesc) {
      const msg = decodeURIComponent(errorDesc).replace(/\+/g, " ");
      setState(classifyAuthError(msg));
      return;
    }

    // Hash flow: #access_token=… or #type=recovery
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setState("set");
      return;
    }

    // Preferred flow: ?token_hash=…&type=recovery (works cross-device)
    if (tokenHash && type === "recovery") {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (error) {
            setState(classifyAuthError(error.message));
            return;
          }
          setState("set");
          window.history.replaceState({}, "", "/reset-password");
        });
      return;
    }

    // PKCE fallback: ?code=… (same-browser only)
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setState(classifyAuthError(error.message));
          return;
        }
        setState("set");
        window.history.replaceState({}, "", "/reset-password");
      });
      return;
    }

    // No token in URL — user landed here directly
    setState("request");
  }, []);

  // Listen for PASSWORD_RECOVERY auth events (handles older flows)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setState("set");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setState("updating");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setState("set");
      setFormError(error.message);
      toast.error(error.message);
      return;
    }
    setState("success");
    toast.success("Password updated.");
    window.setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        {state === "verifying" && <VerifyingPanel />}

        {state === "expired" && (
          <InvalidLinkPanel
            title="Reset link expired"
            icon={<Clock className="h-5 w-5" />}
            description="For your security, reset links expire after 1 hour. Request a new link to continue."
          />
        )}

        {state === "invalid" && (
          <InvalidLinkPanel
            title="This reset link can't be used"
            icon={<AlertCircle className="h-5 w-5" />}
            description="The link is invalid or has already been used. Request a new reset link to set a new password."
          />
        )}

        {state === "request" && (
          <>
            <h1 className="font-display text-3xl font-bold">Reset password</h1>
            <p className="text-muted-foreground">
              To reset your password, request a secure link by email.
            </p>
            <Button asChild className="mt-8 w-full">
              <Link to="/forgot-password">Request a reset link</Link>
            </Button>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {(state === "set" || state === "updating") && (
          <>
            <h1 className="font-display text-3xl font-bold">Set new password</h1>
            <p className="text-muted-foreground">Choose a new password for your account.</p>

            <form onSubmit={handleSet} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="pw">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={state === "updating"}
                />
              </div>
              <div>
                <Label htmlFor="pw2">Confirm new password</Label>
                <Input
                  id="pw2"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={state === "updating"}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-destructive" aria-live="polite">
                    Passwords do not match.
                  </p>
                )}
              </div>

              {formError && (
                <Alert variant="destructive" aria-live="polite">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Couldn't update password</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={
                  state === "updating" ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
                className="w-full"
              >
                {state === "updating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" /> Update password
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>
                Your password has been changed. Taking you to your dashboard…
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function VerifyingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
    </div>
  );
}

function InvalidLinkPanel({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <span className="flex items-center gap-2">{icon}</span>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link to="/forgot-password">Request a new reset link</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
