import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for the whole /parts section.
 * The hub itself lives in parts.index.tsx; every child (categories,
 * partner links, network stock, product pages) renders through this Outlet.
 */
export const Route = createFileRoute("/parts")({
  component: () => <Outlet />,
});
