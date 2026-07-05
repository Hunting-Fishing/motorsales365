// The app's auth-loss flow redirects to `/auth?next=<path>` (see
// `src/hooks/use-auth.tsx` and `src/routes/_authenticated/route.tsx`), but
// the sign-in page itself lives at `/login` and uses `?redirect=`. This
// route bridges the two so the redirect chain never 404s: `/auth?next=X`
// forwards to `/login?redirect=X`, preserving any other query params.
import { createFileRoute, redirect } from "@tanstack/react-router";

type AuthSearch = { next?: string; redirect?: string };

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  // Avoid /auth → /login?redirect=/auth loops.
  if (value === "/auth" || value.startsWith("/auth?")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: safeInternalPath(search.next),
    redirect: safeInternalPath(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    const dest = search.redirect ?? search.next;
    throw redirect({
      to: "/login",
      search: dest ? { redirect: dest } : {},
      replace: true,
    });
  },
});
