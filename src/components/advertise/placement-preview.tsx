import { type SectionValue } from "./placements";

/**
 * Realistic mini-snapshot of each ad surface with a dashed "Your advertisement here"
 * slot in the exact position the ad would appear. Built with theme tokens so it
 * stays on-brand.
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

function AdSlot({
  label = "Your advertisement here",
  sub,
  className = "",
}: {
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-sm border border-dashed border-primary bg-primary/10 text-center animate-pulse ${className}`}
    >
      <span className="px-1 text-[9px] font-semibold leading-tight text-primary">
        {label}
      </span>
      {sub && (
        <span className="text-[7px] uppercase tracking-wide text-primary/70">{sub}</span>
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
          <AdSlot sub="Hero banner" className="h-[38%] w-full" />
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
          <AdSlot sub="Category banner" className="h-[28%] w-full" />
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
            <AdSlot sub="Sidebar tile" className="h-[60%]" />
            <Block className="flex-1" />
          </div>
        </div>
      );
    case "browse":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot sub="Results banner" className="h-[26%] w-full" />
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
          <AdSlot sub="Rides feed top" className="h-[26%] w-full" />
          <div className="grid grid-cols-2 gap-1 flex-1">
            <Block /> <Block />
            <Block /> <Block />
          </div>
        </div>
      );
    case "export":
      return (
        <div className="flex h-full flex-col gap-1">
          <AdSlot sub="Export top" className="h-[26%] w-full" />
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
          <AdSlot sub="Shop banner" className="h-[26%] w-full" />
          <div className="grid grid-cols-[24%_1fr] gap-1 flex-1">
            <AdSlot label="Ad" sub="Sidebar" className="h-full" />
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
            <AdSlot sub="Academy card" className="h-full" />
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
          <AdSlot sub="Featured business" className="h-[28%] w-full" />
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
          <AdSlot sub="Newsletter slot" className="h-[34%] w-full" />
          <Block className="h-2" />
          <Block className="h-2 w-2/3" />
        </div>
      );
    case "custom":
    default:
      return (
        <div className="flex h-full items-center justify-center">
          <AdSlot label="Custom partnership" sub="Tell us your idea" className="h-[70%] w-[70%]" />
        </div>
      );
  }
}
