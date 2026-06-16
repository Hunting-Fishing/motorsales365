import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLayout } from "@/components/site-layout";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "set">("request");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    if (errorDesc) {
      const msg = decodeURIComponent(errorDesc).replace(/\+/g, " ");
      toast.error(msg);
      setLinkError(msg);
    }

    // Preferred flow: ?token_hash=...&type=recovery — works from any device.
    if (tokenHash && type === "recovery") {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (error) {
            toast.error(error.message);
            setLinkError(
              "This password reset link is invalid, expired, or already used. Request a new one below.",
            );
            return;
          }
          setMode("set");
          setLinkError(null);
          window.history.replaceState({}, "", "/reset-password");
        });
    }
    // PKCE fallback: ?code=... → exchange for a session (same-browser only)
    else if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          toast.error(error.message);
          setLinkError(
            "This password reset link can't be completed in this browser. Open the link in the same browser you requested it from, or request a new link below.",
          );
          return;
        }
        setMode("set");
        setLinkError(null);
        window.history.replaceState({}, "", "/reset-password");
      });
    }

    // Implicit/hash flow: #access_token=...&type=recovery
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("set");
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for the reset link.");
    setLinkError(null);
  };

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    window.location.href = "/dashboard";
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold">
          {mode === "request" ? "Reset password" : "Set new password"}
        </h1>
        <p className="text-muted-foreground">
          {mode === "request"
            ? "We'll email you a reset link."
            : "Choose a new password for your account."}
        </p>

        {linkError && mode === "request" && (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {linkError}
          </div>
        )}

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        ) : (
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
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}
