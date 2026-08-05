import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route for the 365 Store (our own merch). Landing page is shop.index.tsx. */
export const Route = createFileRoute("/shop")({
  component: () => <Outlet />,
});
