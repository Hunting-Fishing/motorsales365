import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — merged into /admin/discover-businesses.
export const Route = createFileRoute("/admin/seed-businesses")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/discover-businesses" });
  },
  component: () => null,
});
