import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /franchise and its children (apply, status, partners).
// The landing page content lives in franchise.index.tsx.
export const Route = createFileRoute("/franchise")({
  component: () => <Outlet />,
});
