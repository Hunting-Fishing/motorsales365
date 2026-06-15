import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { TowingServicesPage } from "@/components/towing/towing-services-page";

const searchSchema = z.object({
  listing: z.string().optional(),
  provider: z.string().optional(),
});

export const Route = createFileRoute("/tow")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Request a tow — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Find verified towing & transport providers across the Philippines, or request a tow via the 365 Dispatch network.",
      },
      { property: "og:title", content: "Request a tow — 365 MotorSales Philippines" },
      {
        property: "og:description",
        content:
          "Tell us what's wrong, where you are, and what you're driving — verified PH towing providers respond fast.",
      },
    ],
  }),
  component: TowPage,
});

function TowPage() {
  const search = Route.useSearch();
  return (
    <SiteLayout>
      <TowingServicesPage
        seedListingId={search.listing ?? null}
        requestedProviderId={search.provider ?? null}
      />
    </SiteLayout>
  );
}
