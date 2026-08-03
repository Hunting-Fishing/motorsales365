import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/partner-program")({
  component: PartnerProgramLayout,
});

function PartnerProgramLayout() {
  return <Outlet />;
}
