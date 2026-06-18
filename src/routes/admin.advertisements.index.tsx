import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/advertisements/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/advertisements/inquiries" });
  },
});
