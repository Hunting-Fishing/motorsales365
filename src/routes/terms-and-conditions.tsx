import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy URL: the Terms & Conditions page was consolidated into /terms.
 * This route permanently redirects so old links and bookmarks keep working.
 */
export const Route = createFileRoute("/terms-and-conditions")({
  beforeLoad: () => {
    throw redirect({ to: "/terms", replace: true });
  },
});
