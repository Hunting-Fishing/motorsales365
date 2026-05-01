import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — check your email to verify.");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Could not sign up with Google"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Create account</h1>
        <p className="text-muted-foreground">Buy, sell, and message — one free account does it all.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account…" : "Create account"}
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
          Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
