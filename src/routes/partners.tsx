import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the whole /partners section (hub, network directory, onboarding). */
export const Route = createFileRoute("/partners")({
  component: () => <Outlet />,
});
