import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invites/$token")({
  component: AcceptInvitePage,
});

type Preview = {
  ok: boolean;
  reason?: string;
  email?: string;
  role?: string;
  org_name?: string;
  accepted?: boolean;
  expired?: boolean;
};

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("preview_org_invite", { _token: token });
      if (cancelled) return;
      if (error) setPreview({ ok: false, reason: error.message });
      else setPreview(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_org_invite", { _token: token });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        toast.error(reasonLabel(res?.reason, res?.expected));
        return;
      }
      toast.success("You're in — welcome to the team");
      navigate({ to: "/dashboard/team" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>;
  }

  if (!preview?.ok) {
    return (
      <Centered>
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-3 text-lg font-bold">Invite not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is invalid or has been revoked. Ask your team owner to send a new one.
          </p>
        </Card>
      </Centered>
    );
  }

  if (preview.accepted) {
    return (
      <Centered>
        <Card className="max-w-md p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-lg font-bold">Already accepted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite has already been used. Head to your dashboard to continue.
          </p>
          <Button asChild className="mt-4"><Link to="/dashboard/team">Go to team</Link></Button>
        </Card>
      </Centered>
    );
  }

  if (preview.expired) {
    return (
      <Centered>
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold">Invite expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite has expired. Ask your team owner to resend it.
          </p>
        </Card>
      </Centered>
    );
  }

  const inviteEmail = preview.email!.toLowerCase();
  const signedInWithRightEmail =
    user && (user.email?.toLowerCase() === inviteEmail);

  return (
    <Centered>
      <Card className="max-w-md p-6 text-center">
        <Building2 className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-bold">Join {preview.org_name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You've been invited as a <strong>{preview.role}</strong>.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Invite sent to <strong>{preview.email}</strong>
        </p>

        {!user ? (
          <div className="mt-5 space-y-2">
            <Button asChild className="w-full">
              <Link to="/signup" search={{ invite: token, email: preview.email } as any}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login" search={{ redirect: `/invites/${token}` } as any}>
                I already have an account
              </Link>
            </Button>
          </div>
        ) : !signedInWithRightEmail ? (
          <div className="mt-5">
            <p className="text-sm text-rose-600">
              You're signed in as <strong>{user.email}</strong>, but this invite is for{" "}
              <strong>{preview.email}</strong>.
            </p>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login", search: { redirect: `/invites/${token}` } as any }); }}
            >
              Sign in with the right account
            </Button>
          </div>
        ) : (
          <Button className="mt-5 w-full" onClick={accept} disabled={accepting}>
            {accepting ? "Joining…" : `Join ${preview.org_name}`}
          </Button>
        )}
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] items-center justify-center p-4">{children}</div>;
}

function reasonLabel(reason?: string, expected?: string) {
  switch (reason) {
    case "unauthenticated": return "Please sign in first.";
    case "not_found": return "Invite no longer exists.";
    case "already_accepted": return "This invite has already been used.";
    case "expired": return "This invite has expired.";
    case "email_mismatch": return `This invite is for ${expected}. Sign in with that email.`;
    default: return "Could not accept invite.";
  }
}
