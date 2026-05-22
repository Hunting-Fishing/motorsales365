import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveShopRedirect } from "@/lib/shop-redirect.functions";

export const Route = createFileRoute("/go/$productId")({
  loader: async ({ params, location }) => {
    const search = new URLSearchParams(location.searchStr ?? "");
    const networkSlug = search.get("n") ?? "";
    const visitorId = search.get("v") || null;

    const { url } = await resolveShopRedirect({
      data: { productId: params.productId, networkSlug, visitorId },
    });

    if (!url) throw redirect({ to: "/shop" });
    throw redirect({ href: url });
  },
  component: () => null,
});
