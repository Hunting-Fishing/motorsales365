import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { getVehicleHistory, setVehicleHistoryVisibility } from "@/lib/vehicle-history.functions";

export function VehicleHistoryTimeline({ vehicleId }: { vehicleId: string }) {
  const fetchFn = useServerFn(getVehicleHistory);
  const sharingFn = useServerFn(setVehicleHistoryVisibility);
  const qc = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ["vehicle-history", vehicleId],
    queryFn: () => fetchFn({ data: { vehicleId } }),
  });
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-semibold">365 vehicle history</h2>
      <p className="text-sm text-muted-foreground">
        Purchases, installations and workshop entries for this vehicle. Owner entries and shop
        attestations are labeled separately.
      </p>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {data?.map((e) => (
        <div key={e.id} className="border-l-2 border-primary/40 pl-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <b>{e.title}</b>
            <Badge variant="outline">
              {e.verification_status === "customer_entered"
                ? "Owner entered"
                : e.verification_status === "business_attested"
                  ? "Shop attested"
                  : "365 verified"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {e.occurred_at.slice(0, 10)} · {e.event_type.replaceAll("_", " ")}
            {e.odometer_km !== null ? ` · ${e.odometer_km.toLocaleString()} km` : ""}
          </p>
          <p>{e.summary}</p>
          <label className="mt-1 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={Boolean(e.public_summary_allowed)}
              onChange={async (ev) => {
                try {
                  await sharingFn({ data: { id: e.id, publicSummary: ev.target.checked } });
                  void qc.invalidateQueries({ queryKey: ["vehicle-history"] });
                  void qc.invalidateQueries({ queryKey: ["vehicle-receipts"] });
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            />{" "}
            Share this history summary on public ride/passport
          </label>
        </div>
      ))}
      {data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No history events yet. Confirm a receipt or record an installation to begin.
        </p>
      )}
    </section>
  );
}
