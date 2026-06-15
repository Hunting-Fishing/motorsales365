import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLayout } from "@/components/site-layout";
import { siteOrigin } from "@/lib/site-config";

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Only allow same-origin relative paths (must start with single "/")
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeInternalPath(search.redirect),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  // Single-flight lock: survives re-renders and guarantees only one in-flight
  // auth request at a time, even if React batches state updates.
  const inFlightRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);

  // Disable all auth actions while: a request is in flight, the auth hook is
  // still initializing (header shows the loading spinner), or we already have
  // a session and are about to redirect.
  const authBusy = submitting || googleSubmitting || loading || !!user;

  const goToDashboard = () => {
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(() => {
      window.location.replace("/dashboard");
    }, 1200);
    void navigate({ to: "/dashboard", replace: true }).finally(() => {
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    });
  };

  useEffect(() => {
    void router.preloadRoute({ to: "/dashboard" });
  }, [router]);

  useEffect(() => {
    if (!loading && user) {
      goToDashboard();
    }
    return () => {
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    };
    // reason: `goToDashboard` is recreated each render; depend only on auth state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current || authBusy) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      // Resolve sub-user logins (e.g. "steve@laoagcarsales") to the real auth email.
      let signInEmail = email.trim();
      const looksLikeStaffLogin =
        signInEmail.includes("@") && !signInEmail.split("@")[1]?.includes(".");
      if (looksLikeStaffLogin) {
        const { data: resolved } = await (supabase as any).rpc("resolve_login_to_email", {
          _input: signInEmail.toLowerCase(),
        });
        if (resolved) signInEmail = resolved as string;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("confirm") || msg.includes("not confirmed")) {
          toast.error("Please verify your email first.");
          navigate({ to: "/verify-email", search: { email, intent: undefined } });
          return;
        }
        toast.error(error.message);
        return;
      }
      await refreshSession(data.session);
      toast.success("Welcome back!");
      goToDashboard();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };


  const handleGoogle = async () => {
    if (inFlightRef.current || authBusy) return;
    inFlightRef.current = true;
    setGoogleSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: siteOrigin(),
      });
      if (result.error) {
        toast.error("Could not sign in with Google");
        return;
      }
      if (result.redirected) return;
      goToDashboard();
    } finally {
      inFlightRef.current = false;
      setGoogleSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Sign in</h1>
        <p className="text-muted-foreground">Welcome back to 365 MotorSales Philippines.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email">Email or username</Label>
            <Input
              id="email"
              type="text"
              required
              autoCapitalize="none"
              autoComplete="username"
              placeholder="you@example.com or steve@dealer-slug"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={authBusy} aria-busy={submitting} className="w-full">
            {submitting ? "Signing in…" : loading ? "Loading…" : "Sign in"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          onClick={handleGoogle}
          disabled={authBusy}
          aria-busy={googleSubmitting}
          className="w-full"
        >
          {googleSubmitting ? "Connecting to Google…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}
