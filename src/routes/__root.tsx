import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { CurrencyProvider } from "@/lib/currency";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import { SandboxBanner } from "@/components/sandbox-banner";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      { name: "description", content: "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers." },
      { property: "og:title", content: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      { property: "og:description", content: "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "365 MotorSales Philippines — Buy & Sell Vehicles" },
      { name: "twitter:description", content: "Buy and sell cars, motorcycles, boats, airplanes, and equipment across the Philippines. Trusted listings, private and business sellers." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dPAyk0dbgpbSwcSfaeD3qQVoh0Y2/social-images/social-1778381808817-ChatGPT_Image_May_9,_2026,_07_55_46_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dPAyk0dbgpbSwcSfaeD3qQVoh0Y2/social-images/social-1778381808817-ChatGPT_Image_May_9,_2026,_07_55_46_PM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/logo.png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" },
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
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <FeatureFlagProvider>
        <CurrencyProvider>
          <SandboxBanner />
          <Outlet />
          <Toaster richColors position="top-right" />
        </CurrencyProvider>
      </FeatureFlagProvider>
    </AuthProvider>
  );
}
