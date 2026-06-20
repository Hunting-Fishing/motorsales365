import { createFileRoute } from "@tanstack/react-router";
import { QrLandingContent } from "@/components/qr-landing-content";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "365 Motor Sales Referral — Philippines Motor Marketplace" },
      {
        name: "description",
        content:
          "Discover 365 Motor Sales through a shared feature page for vehicles, businesses, services, future tools, and upcoming platform features in the Philippines.",
      },
      {
        property: "og:title",
        content: "365 Motor Sales — The Motor Marketplace Built for the Philippines",
      },
      {
        property: "og:description",
        content:
          "Search listings, discover services, connect with businesses, and explore the growing 365 motor ecosystem.",
      },
      { property: "og:url", content: `https://365motorsales.com/r/${params.code}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReferralLanding,
});

function ReferralLanding() {
  const { code } = Route.useParams();
  return <QrLandingContent code={code} />;
}
