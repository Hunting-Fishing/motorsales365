import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CookieBanner } from "./cookie-banner";
import bannerImage from "@/assets/banner.png";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <a href="/" aria-label="365 Motor Sales home" className="block">
          <img
            src={bannerImage}
            alt="365 Motor Sales — Buy, Sell, List Vehicles & Equipment across the Philippines"
            className="h-auto w-full max-h-[180px] md:max-h-[220px] object-cover object-center"
            loading="eager"
          />
        </a>
        <SiteHeader />
      </div>
      <main className="brand-watermark flex-1">{children}</main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
