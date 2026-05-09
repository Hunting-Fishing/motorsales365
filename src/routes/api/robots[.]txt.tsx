import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /dashboard",
          "Disallow: /admin",
          "Disallow: /login",
          "Disallow: /signup",
          "Disallow: /reset-password",
          "",
          `Sitemap: ${origin}/api/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
