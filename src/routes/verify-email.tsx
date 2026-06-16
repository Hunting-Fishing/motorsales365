import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MailCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site-layout";
import { siteOrigin } from "@/lib/site-config";

type Search = { email?: string; intent?: string; redirect?: string };

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s.email === "string" ? s.email : undefined,
    intent: typeof s.intent === "string" ? s.intent : undefined,
    redirect: safeInternalPath(s.redirect),
  }),
  component: VerifyEmailPage,
});

const POST_ROUTE: Record<string, string> = {
  buyer: "/dashboard",
  business: "/businesses/submit",
  service_provider: "/businesses/submit",
};

function VerifyEmailPage() {
  const { email, intent, redirect } = useSearch({ from: "/verify-email" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Auto-forward when the user becomes verified (link clicked / session arrives)
  useEffect(() => {
    if (user?.email_confirmed_at) {
      const dest = redirect || (intent && POST_ROUTE[intent]) || "/dashboard";
      toast.success("Email verified — welcome aboard!");
      if (redirect) {
        window.location.assign(dest);
      } else {
        navigate({ to: dest });
      }
    }
  }, [user, intent, redirect, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Missing email address — please sign up again.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteOrigin()}/verify-email${intent || redirect ? "?" : ""}${intent ? `intent=${intent}` : ""}${intent && redirect ? "&" : ""}${redirect ? `redirect=${encodeURIComponent(redirect)}` : ""}`,
      },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verification email sent again. Check your inbox.");
    setCooldown(45);
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-lg flex-col px-4 py-16">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-center font-display text-3xl font-bold">Check your email</h1>
        <p className="mt-3 text-center text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-semibold text-foreground">{email ?? "your email"}</span>. Click it
          to activate your account.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-semibold">What happens next</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>
              • Open the email and tap{" "}
              <span className="font-medium text-foreground">Verify Email</span>.
            </li>
            <li>• You'll be signed in automatically and your account goes live.</li>
            <li>• Until then, listings and "go live" features are paused.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : resending
                ? "Sending…"
                : "Resend verification email"}
          </Button>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Link
            to="/signup"
            search={
              intent
                ? { type: intent, ...(redirect ? { redirect } : {}) }
                : redirect
                  ? { redirect }
                  : {}
            }
            className="hover:underline"
          >
            Wrong email? Start over
          </Link>
            <Link to="/login" search={redirect ? { redirect } : {}} className="hover:underline">
              Already verified? Sign in
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Didn't get the email? Check your spam folder or try resending in a minute.
        </p>
      </div>
    </SiteLayout>
  );
}
