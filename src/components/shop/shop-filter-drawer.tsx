import { useState, useEffect } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { VehicleFitmentPicker } from "@/components/shop/vehicle-fitment-picker";
import { formatVehicle, type GarageVehicle } from "@/lib/garage";
import { cn } from "@/lib/utils";

export interface ShopFilterState {
  categorySlug: string;
  brand: string;
  vehicle: GarageVehicle | null;
}

interface Props {
  categories: { slug: string; name: string }[];
  brands: string[];
  value: ShopFilterState;
  onApply: (next: ShopFilterState) => void;
  lockCategory?: boolean; // category route — don't allow changing
  triggerClassName?: string;
}

export function ShopFilterDrawer({
  categories,
  brands,
  value,
  onApply,
  lockCategory,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopFilterState>(value);

  // Resync when external value changes or drawer opens
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const activeCount =
    (value.categorySlug && !lockCategory ? 1 : 0) +
    (value.brand ? 1 : 0) +
    (value.vehicle ? 1 : 0);

  const reset = () => {
    setDraft({
      categorySlug: lockCategory ? value.categorySlug : "",
      brand: "",
      vehicle: null,
    });
  };

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", triggerClassName)}
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex h-[92vh] flex-col gap-0 rounded-t-2xl p-0 sm:h-[90vh] sm:max-w-lg sm:mx-auto"
      >
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="text-lg">Filter products</SheetTitle>
          <SheetDescription className="text-xs">
            Narrow by category, brand, and what fits your vehicle.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {!lockCategory && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold">Category</Label>
                <div className="flex flex-wrap gap-2">
                  <ChipToggle
                    active={draft.categorySlug === ""}
                    onClick={() => setDraft((d) => ({ ...d, categorySlug: "" }))}
                  >
                    All
                  </ChipToggle>
                  {categories.map((c) => (
                    <ChipToggle
                      key={c.slug}
                      active={draft.categorySlug === c.slug}
                      onClick={() =>
                        setDraft((d) => ({ ...d, categorySlug: c.slug }))
                      }
                    >
                      {c.name}
                    </ChipToggle>
                  ))}
                </div>
              </section>
            )}

            {brands.length > 0 && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold">Brand</Label>
                <div className="flex flex-wrap gap-2">
                  <ChipToggle
                    active={!draft.brand}
                    onClick={() => setDraft((d) => ({ ...d, brand: "" }))}
                  >
                    Any brand
                  </ChipToggle>
                  {brands.map((b) => (
                    <ChipToggle
                      key={b}
                      active={draft.brand.toLowerCase() === b.toLowerCase()}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          brand: d.brand.toLowerCase() === b.toLowerCase() ? "" : b,
                        }))
                      }
                    >
                      {b}
                    </ChipToggle>
                  ))}
                </div>
              </section>
            )}

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Vehicle compatibility</Label>
                {draft.vehicle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setDraft((d) => ({ ...d, vehicle: null }))}
                  >
                    <X className="mr-1 h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
              {draft.vehicle && (
                <Badge variant="secondary" className="max-w-full">
                  <span className="truncate">Fits: {formatVehicle(draft.vehicle)}</span>
                </Badge>
              )}
              <VehicleFitmentPicker
                initial={draft.vehicle}
                showCategory={false}
                onSubmit={(v) => setDraft((d) => ({ ...d, vehicle: v }))}
                submitLabel="Set vehicle"
              />
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row gap-2 border-t bg-background p-3 sm:flex-row">
          <Button variant="ghost" className="flex-1" onClick={reset}>
            Reset
          </Button>
          <Button className="flex-1" onClick={apply}>
            <Check className="mr-1 h-4 w-4" /> Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
