import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route for the Shop Manager workspace. Dashboard lives in workspace.index.tsx. */
export const Route = createFileRoute("/_authenticated/workspace")({
  component: () => <Outlet />,
});
