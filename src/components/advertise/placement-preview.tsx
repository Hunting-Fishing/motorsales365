import { type SectionValue } from "./placements";
import adHero from "@/assets/advertise-samples/ad-hero-dealership.jpg";
import adParts from "@/assets/advertise-samples/ad-parts-banner.jpg";
import adSidebar from "@/assets/advertise-samples/ad-sidebar-insurance.jpg";
import adAcademy from "@/assets/advertise-samples/ad-square-academy.jpg";
import adShop from "@/assets/advertise-samples/ad-shop-feature.jpg";
import adNewsletter from "@/assets/advertise-samples/ad-newsletter.jpg";
import adFinancing from "@/assets/advertise-samples/ad-browse-financing.jpg";
import adTires from "@/assets/advertise-samples/ad-rides-tires.jpg";
import adShipping from "@/assets/advertise-samples/ad-export-shipping.jpg";
import adOil from "@/assets/advertise-samples/ad-shop-oil.jpg";
import adBattery from "@/assets/advertise-samples/ad-shop-battery.jpg";
import adDetailing from "@/assets/advertise-samples/ad-custom-detailing.jpg";
import adHeroTradein from "@/assets/advertise-samples/ad-hero-tradein.jpg";
import adHeroMoto from "@/assets/advertise-samples/ad-hero-moto.jpg";
import adCategoryWide from "@/assets/advertise-samples/ad-category-wide.jpg";

/**
 * Realistic mini-snapshot of each ad surface with a sample ad creative
 * rendered in the exact position the live ad would appear. Each ad slot
 * shows an AI-generated example with an "Example ad" pill so visitors can
 * picture their own creative there.
 */
export function PlacementPreview({ section }: { section: SectionValue }) {
  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden rounded-md border border-border bg-background text-foreground">
      <Chrome url={URL_FOR[section]} />
      <div className="absolute inset-x-0 top-[14%] bottom-0 p-1.5">
        <SiteHeader newsletter={section === "newsletter"} />
        <div className="mt-1 h-[calc(100%-14px)]">
          <SectionBody section={section} />
        </div>
      </div>
    </div>
  );
}

const URL_FOR: Record<SectionValue, string> = {
  marketplace_home: "365motorsales.com",
  marketplace_category: "365motorsales.com/browse/cars",
  marketplace_listing: "365motorsales.com/listing/…",
  browse: "365motorsales.com/browse",
  rides: "365motorsales.com/rides",
  export: "365motorsales.com/export",
  shop: "365motorsales.com/shop",
  learn: "365motorsales.com/learn",
  businesses: "365motorsales.com/businesses",
  newsletter: "365motorsales.com/newsletter",
  custom: "365motorsales.com",
};

function Chrome({ url }: { url: string }) {
  return (
    <div className="flex h-[14%] items-center gap-1.5 border-b border-border bg-muted/60 px-2">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
      <div className="ml-1 flex-1 truncate rounded-sm bg-background/80 px-2 py-0.5 text-[8px] text-muted-foreground">
        {url}
      </div>
    </div>
  );
}

function SiteHeader({ newsletter }: { newsletter?: boolean }) {
  if (newsletter) {
    return (
      <div className="flex h-3 items-center justify-between px-1">
        <div className="h-2 w-10 rounded-sm bg-primary/60" />
        <div className="h-1.5 w-12 rounded-sm bg-muted" />
      </div>
    );
  }
  return (
    <div className="flex h-3 items-center gap-1 rounded-sm bg-card px-1.5">
      <div className="h-1.5 w-6 rounded-sm bg-primary/70" />
      <div className="ml-auto flex gap-1">
        <div className="h-1 w-4 rounded-sm bg-muted" />
        <div className="h-1 w-4 rounded-sm bg-muted" />
        <div className="h-1 w-4 rounded-sm bg-muted" />
        <div className="h-1 w-4 rounded-sm bg-muted" />
      </div>
    </div>
  );
}

/**
 * Renders a real sample ad image inside the slot. The ring + "Example ad"
 * pill make it obvious this is an illustrative creative.
 */
function AdSlot({
  src,
  alt,
  sub,
  className = "",
  showPill = true,
  fit = "contain",
}: {
  src: string;
  alt: string;
  sub?: string;
  className?: string;
  showPill?: boolean;
  fit?: "contain" | "cover";
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm ring-1 ring-primary/60 shadow-sm bg-muted ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
      />
      {showPill && (
        <span className="absolute left-0.5 top-0.5 rounded-[2px] bg-primary/90 px-1 py-[1px] text-[6px] font-semibold uppercase tracking-wide text-primary-foreground">
          Example ad
        </span>
      )}
      {sub && (
        <span className="absolute right-0.5 bottom-0.5 rounded-[2px] bg-background/85 px-1 py-[1px] text-[6px] uppercase tracking-wide text-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-sm bg-muted ${className}`} />
);

function SectionBody({ section }: { section: SectionValue }) {
  switch (section) {
    case "marketplace_home":
      return (
        <div className="flex h-full flex-col gap-1">
          <div className="grid grid-cols-3 gap-1 h-[42%]">
            <AdSlot src={adHero} alt="Sample dealership hero ad" sub="Hero 1" fit="cover" />
            <AdSlot src={adHeroTradein} alt="Sample trade-in hero ad" sub="Hero 2" fit="cover" />
            <AdSlot src={adHeroMoto} alt="Sample motorcycle sale hero ad" sub="Hero 3" fit="cover" />
          </div>
          <div className="grid grid-cols-4 gap-1 flex-1">
            <Block /> <Block /> <Block /> <Block />
          </div>
          <div className="grid grid-cols-4 gap-1 flex-1">
            <Block /> <Block /> <Block /> <Block />
          </div>
        </div>
      );
    case "marketplace_category":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adCategoryWide} alt="Sample wide category banner ad" sub="Category banner" className="h-[34%] w-full" fit="cover" />
          <div className="grid grid-cols-3 gap-1 flex-1">
            <Block /> <Block /> <Block />
            <Block /> <Block /> <Block />
          </div>
        </div>
      );
    case "marketplace_listing":
      return (
        <div className="grid h-full grid-cols-[1fr_36%] gap-1">
          <div className="flex flex-col gap-1">
            <Block className="h-[55%]" />
            <div className="grid grid-cols-3 gap-1 flex-1">
              <Block /> <Block /> <Block />
            </div>
            <Block className="h-2" />
            <Block className="h-2 w-2/3" />
          </div>
          <div className="flex flex-col gap-1">
            <AdSlot src={adSidebar} alt="Sample sidebar insurance ad" sub="Sidebar tile" className="h-[60%]" />
            <Block className="flex-1" />
          </div>
        </div>
      );
    case "browse":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adFinancing} alt="Sample car loan financing banner ad" sub="Results banner" className="h-[26%] w-full" />
          <div className="grid grid-cols-[28%_1fr] gap-1 flex-1">
            <div className="flex flex-col gap-1">
              <Block className="h-2" />
              <Block className="h-2" />
              <Block className="h-2" />
              <Block className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Block /> <Block /> <Block />
              <Block /> <Block /> <Block />
            </div>
          </div>
        </div>
      );
    case "rides":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adTires} alt="Sample performance tires banner ad" sub="Rides feed top" className="h-[26%] w-full" />
          <div className="grid grid-cols-2 gap-1 flex-1">
            <Block /> <Block />
            <Block /> <Block />
          </div>
        </div>
      );
    case "export":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adShipping} alt="Sample vehicle export shipping banner ad" sub="Export top" className="h-[26%] w-full" />
          <div className="flex flex-col gap-1 flex-1">
            <Block className="h-3" />
            <Block className="h-3" />
            <Block className="h-3" />
            <Block className="h-3" />
          </div>
        </div>
      );
    case "shop":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adOil} alt="Sample synthetic motor oil banner ad" sub="Shop banner" className="h-[26%] w-full" />
          <div className="grid grid-cols-[24%_1fr] gap-1 flex-1">
            <AdSlot src={adBattery} alt="Sample car battery sidebar ad" sub="Sidebar" className="h-full" showPill={false} />
            <div className="grid grid-cols-3 gap-1">
              <Block /> <Block /> <Block />
              <Block /> <Block /> <Block />
            </div>
          </div>
        </div>
      );
    case "learn":
      return (
        <div className="flex h-full flex-col gap-1">
          <Block className="h-2 w-1/3" />
          <div className="grid grid-cols-4 gap-1 flex-1">
            <Block />
            <AdSlot src={adAcademy} alt="Sample academy sponsor card ad" sub="Academy card" className="h-full" />
            <Block />
            <Block />
          </div>
          <div className="grid grid-cols-4 gap-1 flex-1">
            <Block /> <Block /> <Block /> <Block />
          </div>
        </div>
      );
    case "businesses":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot src={adShop} alt="Sample featured business ad" sub="Featured business" className="h-[28%] w-full" />
          <div className="flex flex-col gap-1 flex-1">
            <Block className="h-3" />
            <Block className="h-3" />
            <Block className="h-3" />
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="mx-auto flex h-full w-[78%] flex-col gap-1 rounded-sm border border-border bg-card p-1.5 shadow-sm">
          <Block className="h-2 w-1/2" />
          <Block className="h-4" />
          <AdSlot src={adNewsletter} alt="Sample newsletter sponsor ad" sub="Newsletter slot" className="h-[34%] w-full" />
          <Block className="h-2" />
          <Block className="h-2 w-2/3" />
        </div>
      );
    case "custom":
    default:
      return (
        <div className="flex h-full items-center justify-center">
          <AdSlot src={adDetailing} alt="Sample ceramic coating detailing ad" sub="Custom partnership" className="h-[70%] w-[70%]" />
        </div>
      );
  }
}
