import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CookieBanner } from "./cookie-banner";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { MobileTabBar } from "./mobile-tab-bar";
import { FloatingHelpWidget } from "./support/floating-help-widget";
import bannerImage from "@/assets/banner.webp";

// Hotspots overlaid on the banner image's tile strip.
// Coordinates are normalized percentages of the banner so they stay aligned
// across viewport sizes (the banner uses object-contain + h-auto w-full).
const TILE_TOP = "76.6%";
const TILE_HEIGHT = "12.4%";

type Hotspot = {
  label: string;
  left: string;
  width: string;
} & (
  | { to: "/browse/$category"; params: { category: string } }
  | { to: "/parts" | "/businesses" }
);

const HOTSPOTS: Hotspot[] = [
  { label: "Browse cars", left: "9.3%", width: "9.2%", to: "/browse/$category", params: { category: "car" } },
  { label: "Browse motorcycles", left: "18.8%", width: "9.2%", to: "/browse/$category", params: { category: "motorcycle" } },
  { label: "Browse trucks", left: "28.3%", width: "9.5%", to: "/browse/$category", params: { category: "truck" } },
  { label: "Browse heavy equipment", left: "38.1%", width: "9.5%", to: "/browse/$category", params: { category: "equipment" } },
  { label: "Browse parts", left: "47.8%", width: "9.3%", to: "/parts" },
  { label: "Browse tires", left: "57.4%", width: "9.5%", to: "/browse/$category", params: { category: "tires" } },
  { label: "Find repair shops", left: "67.1%", width: "9.6%", to: "/browse/$category", params: { category: "repair" } },
  { label: "Related businesses", left: "76.9%", width: "16.2%", to: "/businesses" },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Pages that need a clean, solid background (watermark would bleed through content).
  const cleanBg =
    pathname.startsWith("/shop") || /\/checkout(\/|$)/.test(pathname);
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <PaymentTestModeBanner />
      <div className="relative block bg-white">
        <img
          src={bannerImage}
          alt="365 Motor Sales — Buy, Sell, List Vehicles & Equipment across the Philippines"
          className="h-auto w-full object-contain object-center"
          loading="eager"
        />
        {/* Logo area → home */}
        <Link
          to="/"
          aria-label="365 Motor Sales home"
          title="Home"
          className="absolute rounded-md transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ left: "24%", top: "8%", width: "28%", height: "60%" }}
        />
        {/* Category tile hotspots */}
        {HOTSPOTS.map((h) =>
          "params" in h ? (
            <Link
              key={h.label}
              to={h.to}
              params={h.params}
              aria-label={h.label}
              title={h.label}
              className="absolute rounded-md transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ left: h.left, width: h.width, top: TILE_TOP, height: TILE_HEIGHT }}
            />
          ) : (
            <Link
              key={h.label}
              to={h.to}
              aria-label={h.label}
              title={h.label}
              className="absolute rounded-md transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ left: h.left, width: h.width, top: TILE_TOP, height: TILE_HEIGHT }}
            />
          ),
        )}
      </div>
      <div className="sticky top-0 z-50">
        <SiteHeader />
      </div>
      <main className={cleanBg ? "flex-1 bg-background" : "brand-watermark flex-1"}>
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
      <FloatingHelpWidget />
      <MobileTabBar />
    </div>
  );
}
