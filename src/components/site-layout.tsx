import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CookieBanner } from "./cookie-banner";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { MobileTabBar } from "./mobile-tab-bar";
import { FloatingHelpWidget } from "./support/floating-help-widget";
import bannerImage from "@/assets/banner.webp";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <PaymentTestModeBanner />
      <a href="/" aria-label="365 Motor Sales home" className="block bg-white">
        <img
          src={bannerImage}
          alt="365 Motor Sales — Buy, Sell, List Vehicles & Equipment across the Philippines"
          className="h-auto w-full sm:max-h-[140px] md:max-h-[220px] sm:object-cover object-contain object-center"
          loading="eager"
        />
      </a>
      <div className="sticky top-0 z-50">
        <SiteHeader />
      </div>
      <main className="brand-watermark flex-1">{children}</main>
      <SiteFooter />
      <CookieBanner />
      <FloatingHelpWidget />
      <MobileTabBar />
    </div>
  );
}
