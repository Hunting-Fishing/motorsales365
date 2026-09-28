import { createFileRoute } from "@tanstack/react-router";
import mcp from "@/lib/mcp/index";
import { handleProtectedResourceMetadata } from "@/lib/mcp/handler.server";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      ANY: ({ request }) => handleProtectedResourceMetadata(mcp, request),
    },
  },
});
