import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: forwards to the new QR Advertisements admin page.
export const Route = createFileRoute("/admin/advertisements/share-kit")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/advertisements/qr-ads", replace: true });
  },
});
