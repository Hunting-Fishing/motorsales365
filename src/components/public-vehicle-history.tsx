import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicVehicleHistory } from "@/lib/vehicle-history.functions";
export function PublicVehicleHistory({
  slug,
  surface,
}: {
  slug: string;
  surface: "ride" | "passport";
}) {
  const fn = useServerFn(getPublicVehicleHistory);
  const { data } = useQuery({
    queryKey: ["public-vehicle-history", surface, slug],
    queryFn: () => fn({ data: { slug, surface } }),
  });
  if (!data?.length) return null;
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-semibold">365 parts & service history</h2>
      <p className="text-xs text-muted-foreground">
        Summaries shared by the owner. Original receipts remain private.
      </p>
      {data.map((e) => (
        <div key={e.id} className="border-l-2 border-primary/30 pl-3 text-sm">
          <b>{e.title}</b>
          <p>
            {e.occurred_at.slice(0, 10)} · {e.event_type.replaceAll("_", " ")}
            {e.odometer_km !== null ? ` · ${e.odometer_km} km` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {e.verification_status === "customer_entered"
              ? "Owner entered"
              : e.verification_status === "business_attested"
                ? "Shop attested"
                : "365 verified"}
          </p>
        </div>
      ))}
    </section>
  );
}
