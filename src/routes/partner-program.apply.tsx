import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partner-program/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/partner-program" });
  },
  component: () => null,
});
