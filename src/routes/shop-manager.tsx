import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route for public Shop Manager pages (overview, pricing, checkout). */
export const Route = createFileRoute("/shop-manager")({
  component: () => <Outlet />,
});
