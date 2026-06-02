import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { CurrencyProvider } from "@/lib/currency";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import { SandboxBanner } from "@/components/sandbox-banner";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsGA } from "@/components/analytics-ga";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground sm:text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1e3a8a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "365 MotorSales" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { title: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      {
        name: "description",
        content:
          "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers.",
      },
      { property: "og:title", content: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      {
        property: "og:description",
        content:
          "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "365 MotorSales" },
      { property: "og:url", content: "https://www.365motorsales.com/" },
      { property: "og:image", content: "https://www.365motorsales.com/og-default.png" },
      { property: "og:image:width", content: "1216" },
      { property: "og:image:height", content: "640" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      {
        name: "twitter:description",
        content:
          "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers.",
      },
      { name: "twitter:image", content: "https://www.365motorsales.com/og-default.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "365 MotorSales",
          url: "https://www.365motorsales.com",
          logo: "https://www.365motorsales.com/logo.png",
          description:
            "Philippines marketplace for cars, motorcycles, boats, airplanes, and equipment.",
          address: { "@type": "PostalAddress", addressCountry: "PH" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "365 MotorSales",
          url: "https://www.365motorsales.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.365motorsales.com/browse/car?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagProvider>
          <CurrencyProvider>
            <SandboxBanner />
            <Outlet />
            <Toaster richColors position="top-right" />
            <ConfirmDialogHost />
            <AnalyticsGA />
            <ServiceWorkerRegister />
          </CurrencyProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
