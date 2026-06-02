import { Link, useRouter } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export function RouteErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

export function RouteNotFoundBoundary({ message }: { message?: string }) {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? "We couldn't find what you were looking for."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}
