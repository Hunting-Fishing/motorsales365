import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: forwards to the new QR Advertisements page.
export const Route = createFileRoute("/dashboard/share-kit")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/qr-ads", replace: true });
  },
});
