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

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current || authBusy) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error("Could not sign in with Google"); return; }
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
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

        <Button variant="outline" onClick={handleGoogle} disabled={authBusy} aria-busy={googleSubmitting} className="w-full">
          {googleSubmitting ? "Connecting to Google…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
