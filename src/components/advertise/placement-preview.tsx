import { type SectionValue } from "./placements";

// Tiny SVG wireframes that hint at where each placement lives on the site.
export function PlacementPreview({ section }: { section: SectionValue }) {
  const common = "h-24 w-full rounded-md border border-border bg-secondary/40";

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <svg viewBox="0 0 160 80" className={common} preserveAspectRatio="none">
      <rect x="2" y="2" width="156" height="10" rx="2" className="fill-muted" />
      {children}
    </svg>
  );

  switch (section) {
    case "marketplace_home":
    case "browse":
      return (
        <Frame>
          <rect x="6" y="18" width="148" height="22" rx="2" className="fill-primary/70" />
          <rect x="6" y="44" width="46" height="32" rx="2" className="fill-muted" />
          <rect x="56" y="44" width="46" height="32" rx="2" className="fill-muted" />
          <rect x="106" y="44" width="48" height="32" rx="2" className="fill-muted" />
        </Frame>
      );
    case "marketplace_category":
    case "rides":
    case "export":
    case "shop":
      return (
        <Frame>
          <rect x="6" y="18" width="148" height="16" rx="2" className="fill-primary/70" />
          <rect x="6" y="40" width="148" height="36" rx="2" className="fill-muted" />
        </Frame>
      );
    case "marketplace_listing":
      return (
        <Frame>
          <rect x="6" y="18" width="100" height="58" rx="2" className="fill-muted" />
          <rect x="110" y="18" width="44" height="28" rx="2" className="fill-primary/70" />
          <rect x="110" y="50" width="44" height="26" rx="2" className="fill-muted" />
        </Frame>
      );
    case "learn":
      return (
        <Frame>
          <rect x="6" y="18" width="148" height="22" rx="2" className="fill-muted" />
          <rect x="6" y="44" width="148" height="32" rx="2" className="fill-primary/70" />
        </Frame>
      );
    case "businesses":
      return (
        <Frame>
          <rect x="6" y="18" width="148" height="14" rx="2" className="fill-muted" />
          <rect x="6" y="36" width="148" height="14" rx="2" className="fill-primary/70" />
          <rect x="6" y="54" width="148" height="22" rx="2" className="fill-muted" />
        </Frame>
      );
    case "newsletter":
      return (
        <svg viewBox="0 0 160 80" className={common} preserveAspectRatio="none">
          <rect x="20" y="6" width="120" height="68" rx="3" className="fill-card stroke-border" />
          <rect x="28" y="14" width="104" height="10" rx="2" className="fill-muted" />
          <rect x="28" y="28" width="104" height="20" rx="2" className="fill-primary/70" />
          <rect x="28" y="52" width="104" height="14" rx="2" className="fill-muted" />
        </svg>
      );
    case "custom":
    default:
      return (
        <Frame>
          <rect x="6" y="18" width="148" height="58" rx="2" className="fill-muted" strokeDasharray="4 3" />
        </Frame>
      );
  }
}
