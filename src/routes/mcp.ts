import { createFileRoute } from "@tanstack/react-router";
import mcp from "@/lib/mcp/index";
import { handleMcpRequest } from "@/lib/mcp/handler.server";

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      // ANY: without it TanStack would serve SPA HTML for unsupported methods.
      ANY: ({ request }) => handleMcpRequest(mcp, request),
    },
  },
});
