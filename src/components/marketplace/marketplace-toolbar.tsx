import { LayoutGrid, Map as MapIcon, Rows3, Rows2, Grid2x2, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridDensity } from "@/hooks/use-grid-density";

export type ViewMode = "grid" | "map";

interface Props {
  resultCount: number;
  loading?: boolean;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  density: GridDensity;
  onDensityChange: (d: GridDensity) => void;
  showMap?: boolean;
  right?: React.ReactNode;
}

/**
 * Sticky marketplace toolbar — result count, density toggle (2/3/4) and grid/map view switch.
 * Keep this presentational; parent owns state and persistence.
 */
export function MarketplaceToolbar({
  resultCount,
  loading,
  view,
  onViewChange,
  density,
  onDensityChange,
  showMap = true,
  right,
}: Props) {
  return (
    <div className="sticky top-16 z-20 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:mx-0 md:rounded-xl md:border md:px-3 md:shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {loading
            ? "Loading…"
            : `${resultCount.toLocaleString()} result${resultCount === 1 ? "" : "s"}`}
        </p>

        <div className="ml-auto flex items-center gap-2">
          {right}

          {/* Density toggle — desktop only, decides cards per row */}
          <div className="hidden items-center rounded-md border border-border bg-card p-0.5 md:flex">
            <DensityButton
              active={density === 2}
              label="2 per row"
              onClick={() => onDensityChange(2)}
            >
              <Rows2 className="h-3.5 w-3.5" />
            </DensityButton>
            <DensityButton
              active={density === 3}
              label="3 per row"
              onClick={() => onDensityChange(3)}
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </DensityButton>
            <DensityButton
              active={density === 4}
              label="4 per row"
              onClick={() => onDensityChange(4)}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </DensityButton>
          </div>

          {/* View toggle */}
          {showMap && (
            <div className="flex items-center rounded-md border border-border bg-card p-0.5">
              <ViewButton
                active={view === "grid"}
                label="Grid view"
                onClick={() => onViewChange("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="ml-1 hidden text-xs font-medium sm:inline">Grid</span>
              </ViewButton>
              <ViewButton
                active={view === "map"}
                label="Map view"
                onClick={() => onViewChange("map")}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span className="ml-1 hidden text-xs font-medium sm:inline">Map</span>
              </ViewButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DensityButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded px-2 transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
