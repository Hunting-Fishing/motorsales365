import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Car, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type RideOption = {
  id: string;
  name: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  vehicle_type: string;
  cover_photo_url: string | null;
};

type Props = {
  value: string | null;
  onSelect: (ride: RideOption | null) => void;
};

export function RidePicker({ value, onSelect }: Props) {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .from("rides")
      .select(
        "id,name,year,make,model,trim,engine,transmission,drivetrain,vehicle_type,cover_photo_url",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: any) => {
        if (!cancelled) {
          setRides(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>{" "}
        to pre-fill from a vehicle in My Rides.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Use a vehicle from My Rides
        </span>
        <Link
          to="/dashboard/rides_/new"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> Add a ride
        </Link>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading your rides…</div>
      ) : rides.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          You don't have any rides yet. Add one to auto-fill year, make, model, and drivetrain.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 text-xs",
              value === null
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border hover:border-primary/40",
            )}
          >
            None
          </button>
          {rides.map((r) => {
            const selected = value === r.id;
            const subtitle = [r.year, r.make, r.model].filter(Boolean).join(" ");
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg border p-2 text-left",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  {r.cover_photo_url ? (
                    <img
                      src={r.cover_photo_url}
                      alt={r.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{r.name}</div>
                  {subtitle && (
                    <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
