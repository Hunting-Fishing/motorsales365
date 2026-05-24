import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Car, Heart, MessageCircle, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VehicleFitmentPicker } from "@/components/shop/vehicle-fitment-picker";
import { useShopFavorites } from "@/components/shop/shop-favorite-button";
import { formatVehicle, type GarageVehicle } from "@/lib/garage";

interface Props {
  vehicle: GarageVehicle | null | undefined;
  onPickVehicle: (v: GarageVehicle) => void;
  onClearVehicle?: () => void;
}

export function ShopMobileCtaBar({ vehicle, onPickVehicle, onClearVehicle }: Props) {
  const [open, setOpen] = useState(false);
  const favs = useShopFavorites();
  const favCount = favs.size;

  return (
    <>
      {/* Spacer so content isn't hidden behind the bar */}
      <div className="h-16 md:hidden" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)] md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant={vehicle ? "secondary" : "default"}
                size="sm"
                className="h-12 flex-col gap-0.5 text-[11px] leading-none"
              >
                {vehicle ? <Check className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                <span className="max-w-full truncate">
                  {vehicle ? vehicle.model : "Select vehicle"}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Shop by your vehicle</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <VehicleFitmentPicker
                  initial={vehicle ?? undefined}
                  onSubmit={(v) => {
                    onPickVehicle(v);
                    setOpen(false);
                  }}
                  submitLabel="Apply"
                />
                {vehicle && onClearVehicle && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3 text-sm">
                    <span className="truncate">
                      Current: <strong>{formatVehicle(vehicle)}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClearVehicle();
                        setOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="relative h-12 flex-col gap-0.5 text-[11px] leading-none"
          >
            <Link to="/dashboard/shop-favorites">
              <Heart className="h-4 w-4" />
              <span>Saved</span>
              {favCount > 0 && (
                <Badge
                  className="absolute right-1 top-1 h-4 min-w-[16px] justify-center px-1 text-[9px]"
                  variant="default"
                >
                  {favCount}
                </Badge>
              )}
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-12 flex-col gap-0.5 text-[11px] leading-none"
          >
            <Link to="/contact">
              <MessageCircle className="h-4 w-4" />
              <span>Contact</span>
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
