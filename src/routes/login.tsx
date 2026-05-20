import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Hard-navigate so we don't wait on a stale dynamic chunk and so every
      // subscriber (header, dashboard, etc.) renders against the new session.
      window.location.replace("/dashboard");
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
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
    // Full page load avoids the stale-chunk hang where the dashboard route
    // would take 15–20s (or never) to dynamically import after sign-in.
    window.location.replace("/dashboard");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Could not sign in with Google"); return; }
    if (result.redirected) return;
    window.location.replace("/dashboard");
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
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={handleGoogle} className="w-full">
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
