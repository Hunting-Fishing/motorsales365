// Auto-injected by the Supabase integration when this file does not exist.
//
// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user. The subtree is client-rendered (`ssr: false`)
// because Supabase stores the session in `localStorage`, which the server cannot
// read.
//
// Two-layer protection:
//   1. `beforeLoad` — one-shot gate on navigation into a protected route.
//   2. `<AuthenticatedGuard />` — reactive gate that also handles mid-session
//      auth loss (unexpected SIGNED_OUT / refresh_token failure) by redirecting
//      to `/auth?next=<current-path>` so the login CTA state is preserved.
import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const SIGN_IN_ROUTE = "/auth";

function buildNext(pathname: string, search: string): string {
  const path = pathname || "/";
  if (path === SIGN_IN_ROUTE || path.startsWith(`${SIGN_IN_ROUTE}?`)) return "/";
  return `${path}${search ?? ""}`;
}

function AuthenticatedGuard() {
  const { user, loading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  useEffect(() => {
    if (loading) return;
    if (user) return;
    // No user after bootstrap resolved — either unexpected SIGNED_OUT or a
    // refresh_token failure. Redirect to the sign-in route preserving the
    // intended destination so the login CTA can bounce back after re-auth.
    const next = buildNext(location.pathname, location.searchStr);
    navigate({
      to: SIGN_IN_ROUTE,
      search: { next, ...(authError ? { reason: authError } : {}) } as any,
      replace: true,
    });
  }, [user, loading, authError, location.pathname, location.searchStr, navigate]);

  if (!user) return null;
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const next = buildNext(location.pathname, location.searchStr);
      throw redirect({
        to: SIGN_IN_ROUTE,
        search: { next } as any,
      });
    }
    return { user: data.user };
  },
  component: AuthenticatedGuard,
});
