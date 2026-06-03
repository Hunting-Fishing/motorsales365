/**
 * Shared error / not-found boundary components for TanStack Router routes.
 *
 * Every route with a loader should attach:
 *   errorComponent: RouteError,
 *   notFoundComponent: RouteNotFound,
 *
 * Set as the router defaults in src/router.tsx so any route that omits them
 * still gets a clean fallback instead of a blank screen.
 */
import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  error: Error;
  reset?: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  const router = useRouter();
  const message =
    (error && typeof error.message === "string" && error.message) ||
    "Something went wrong while loading this page.";

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        We couldn’t load this page
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="default"
          onClick={() => {
            reset?.();
            void router.invalidate();
          }}
        >
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link to="/">
            <Home className="mr-2 size-4" aria-hidden="true" />
            Go home
          </Link>
        </Button>
      </div>
    </main>
  );
}

export function RouteNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        <SearchX className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you’re looking for moved or never existed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="default">
          <Link to="/">
            <Home className="mr-2 size-4" aria-hidden="true" />
            Go home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/shop">Browse listings</Link>
        </Button>
      </div>
    </main>
  );
}
