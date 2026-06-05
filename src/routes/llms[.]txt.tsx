import { createFileRoute } from "@tanstack/react-router";

const ORIGIN = "https://www.365motorsales.com";

/**
 * llms.txt — guidance for LLM-based crawlers and AI search engines.
 * https://llmstxt.org
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `# 365 MotorSales Philippines

> The Philippines' modern motor-vehicle marketplace and services directory: cars, motorcycles, boats, airplanes, equipment, towing, car-wash, parts, repair, body-shop, salvage and more. Includes a verified business directory, exporter brokerage, learning hub, ride-share and a passport / KYC system for sellers.

## About
- Country focus: Philippines
- Languages: English, Filipino
- Operator: 365 MotorSales
- Canonical domain: ${ORIGIN}

## Primary sections
- [Home](${ORIGIN}/)
- [Listings — browse](${ORIGIN}/shop)
- [Verified businesses](${ORIGIN}/businesses)
- [Rides / car-pool](${ORIGIN}/rides)
- [Towing services](${ORIGIN}/tow)
- [Map view](${ORIGIN}/map)
- [Learning hub](${ORIGIN}/learn)
- [Partner training](${ORIGIN}/partner-training)
- [Export brokerage](${ORIGIN}/export)
- [Sell on 365 MotorSales](${ORIGIN}/sell)
- [Advertise](${ORIGIN}/advertise)
- [Pricing & subscriptions](${ORIGIN}/pricing)

## Trust & safety
- [Terms](${ORIGIN}/terms)
- [Privacy](${ORIGIN}/privacy)
- [Refund policy](${ORIGIN}/refund-policy)
- [Community guidelines](${ORIGIN}/guidelines)
- [Affiliate disclosure](${ORIGIN}/affiliate-disclosure)

## Support
- [Help center](${ORIGIN}/support)
- [Buying help](${ORIGIN}/support/buying)
- [Selling help](${ORIGIN}/support/selling)
- [Account help](${ORIGIN}/support/account)
- [Business help](${ORIGIN}/support/business)
- [Contact](${ORIGIN}/contact)

## Not for crawling
Routes under /admin, /dashboard, /api, /login, /signup, /reset-password, /forgot-password, /unsubscribe, /email and /r/ are application surfaces — see /robots.txt.
`;
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
