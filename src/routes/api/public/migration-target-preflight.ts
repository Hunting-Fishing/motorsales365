import { createFileRoute } from "@tanstack/react-router";

function retired() {
  return new Response(
    JSON.stringify({
      error: "migration_endpoint_retired",
      message: "The standalone Supabase migration is closed.",
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}

export const Route = createFileRoute("/api/public/migration-target-preflight")({
  server: { handlers: { GET: retired, POST: retired } },
});
