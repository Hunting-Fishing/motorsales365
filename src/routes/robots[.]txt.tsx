import { createFileRoute } from "@tanstack/react-router";

const CANONICAL_ORIGIN = "https://365motorsales.com";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /admin/",
          "Disallow: /dashboard",
          "Disallow: /dashboard/",
          "Disallow: /api/",
          "Disallow: /lovable/",
          "Disallow: /login",
          "Disallow: /signup",
          "Disallow: /reset-password",
          "Disallow: /forgot-password",
          "Disallow: /unsubscribe",
          "Disallow: /email/",
          "Disallow: /r/",
          "Disallow: /listing/*/edit",
          "",
          `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
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
