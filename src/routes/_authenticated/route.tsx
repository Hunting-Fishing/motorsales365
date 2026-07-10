// Auto-injected by the Supabase integration when this file does not exist.
//
// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user. The subtree is client-rendered (`ssr: false`)
// because Supabase stores the session in `localStorage`, which the server cannot
// read.
//
// Two-layer protection:
//   1. `beforeLoad` — cheap local session check. Only redirects when there is
//      no persisted session at all; never calls a network endpoint that could
//      transiently fail and bounce a signed-in user to /auth.
//   2. `<AuthenticatedGuard />` — reactive gate driven by useAuth. On real
//      auth loss it redirects on web, or renders a reconnect banner in the
//      installed PWA so the user doesn't lose their view / form state.
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
import { isStandalonePWA } from "@/lib/session-policy";

const SIGN_IN_ROUTE = "/auth";

function buildNext(pathname: string, search: string): string {
  const path = pathname || "/";
  if (path === SIGN_IN_ROUTE || path.startsWith(`${SIGN_IN_ROUTE}?`)) return "/";
  return `${path}${search ?? ""}`;
}

function ReconnectBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500/95 px-4 py-2 text-sm text-black shadow">
      <span>You&rsquo;ve been disconnected. Reconnect to keep using your account.</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded bg-black/80 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
      >
        Reconnect
      </button>
    </div>
  );
}

function AuthenticatedGuard() {
  const { user, loading, authError, retryAuth } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  const standalone = isStandalonePWA();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    // Installed PWA: never yank the user to /auth on transient loss. The
    // reconnect banner (below) lets them re-authenticate in place.
    if (standalone) return;
    // Web: only redirect once we're sure this isn't a mid-refresh blip. The
    // auth hook now retries a failed refresh once before setting authError,
    // so by the time !loading && !user we've already exhausted retries.
    const next = buildNext(location.pathname, location.searchStr);
    navigate({
      to: SIGN_IN_ROUTE,
      search: { next, ...(authError ? { reason: authError } : {}) } as any,
      replace: true,
    });
  }, [user, loading, authError, location.pathname, location.searchStr, navigate, standalone]);

  if (user) return <Outlet />;
  // PWA fallback while we wait for the user to reconnect. Keep the last
  // rendered subtree unmounted (we don't have it here) but at least surface
  // a clear CTA so the app isn't a blank page.
  if (standalone) {
    return (
      <div className="min-h-dvh">
        <ReconnectBanner onRetry={() => void retryAuth()} />
        <div className="p-6 text-sm text-muted-foreground">
          Sign back in to continue where you left off.
        </div>
      </div>
    );
  }
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Cheap local check only — no network call. Prior versions called
    // supabase.auth.getUser() here, which hits /auth/v1/user and returned an
    // error on any transient network hiccup, kicking valid sessions out to
    // /auth. Now we trust the persisted session and let onAuthStateChange in
    // useAuth handle real refresh failures.
    const { data: sessData } = await supabase.auth.getSession();
    if (!sessData.session) {
      const next = buildNext(location.pathname, location.searchStr);
      throw redirect({ to: SIGN_IN_ROUTE, search: { next } as any });
    }
    return { user: sessData.session.user };
  },

  component: AuthenticatedGuard,
});
