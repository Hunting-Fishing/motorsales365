import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getCustomerVehicleActivity } from "@/lib/customer-vehicle-activity.functions";
import type { ActivityKind, ActivityResult } from "@/lib/customer-vehicle-activity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type VehicleChoice = {
  id: string;
  customer_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
};
type Props = {
  customerId: string;
  vehicles: readonly VehicleChoice[];
  vehiclesLoading: boolean;
  vehiclesError: boolean;
};
const sources = {
  receipts: {
    title: "Receipt purchases",
    limit: "confirmed receipt purchases",
    empty: "No visible confirmed receipt purchases in this snapshot.",
  },
  installations: {
    title: "Shop-recorded installations",
    limit: "shop-recorded installations",
    empty: "No visible matching shop-recorded installations in this snapshot.",
  },
  work_orders: {
    title: "Work-order snapshots",
    limit: "work-order snapshots",
    empty: "No visible matching work-order snapshots in this snapshot.",
  },
} as const;

function purchaseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Purchase date not provided";
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return "Purchase date not provided";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}
function timestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date not provided"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(parsed);
}
function amount(value: number | null, currency: string) {
  if (value === null) return "Amount not provided";
  // Receipt NUMERIC has no fixed minor-unit scale. Show the received JSON number
  // without currency-default rounding or conversion. This cannot restore SQL
  // precision already lost in number transport and is not reconciliation.
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 20,
  }).format(value);
  const preservesReceivedNumber = Number(formatted.replaceAll(",", "")) === value;
  return `${currency} ${preservesReceivedNumber ? formatted : value.toString()}`;
}
function vehicleLabel(vehicle: VehicleChoice) {
  const identity = [vehicle.year, vehicle.make, vehicle.model]
    .filter((part) => part !== null && part !== "")
    .join(" ");
  return `${identity || "Vehicle"}${vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""} · ${vehicle.id.slice(0, 8)}`;
}

function ActivityRows({ result }: { result: ActivityResult }) {
  if (result.kind === "receipts") {
    return (
      <ul aria-label="Receipt purchases records" className="space-y-3">
        {result.rows.slice(0, 25).map((row) => (
          <li key={row.id} className="rounded-lg border p-3 text-sm">
            <p className="break-words font-medium">{row.vendor || "Vendor not provided"}</p>
            <p className="mt-1 font-medium tabular-nums">{amount(row.total, row.currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{purchaseDate(row.purchased_on)}</p>
          </li>
        ))}
      </ul>
    );
  }
  if (result.kind === "installations") {
    return (
      <ul aria-label="Shop-recorded installations records" className="space-y-3">
        {result.rows.slice(0, 25).map((row) => (
          <li key={row.id} className="rounded-lg border p-3 text-sm">
            <p className="break-words font-medium">{row.name_snapshot}</p>
            <Badge variant="outline" className="mt-2">
              Shop-recorded
            </Badge>
            {row.part_number_snapshot ? (
              <p className="mt-2 break-words text-xs">Part {row.part_number_snapshot}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Installed {timestamp(row.installed_at)} · Quantity{" "}
              {row.installed_quantity.toLocaleString("en-PH")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.installed_odometer_km === null
                ? "Odometer not provided"
                : `${row.installed_odometer_km.toLocaleString("en-PH")} km`}
            </p>
            {row.work_order_id ? (
              <Link
                to="/workspace/work-orders/$id"
                params={{ id: row.work_order_id }}
                className="mt-2 inline-block text-primary hover:underline"
              >
                Open installation work order
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul aria-label="Work-order snapshots records" className="space-y-3">
      {result.rows.slice(0, 25).map((row) => (
        <li key={row.id} className="rounded-lg border p-3 text-sm">
          <Link
            to="/workspace/work-orders/$id"
            params={{ id: row.id }}
            className="font-medium text-primary hover:underline"
          >
            {row.work_order_number || `Work order ${row.id.slice(0, 8)}`}
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">Current status</p>
          <Badge variant="outline" className="mt-1">
            {row.status}
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">Opened {timestamp(row.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}

function ActivitySource({
  accountId,
  customerId,
  shopVehicleId,
  kind,
}: {
  accountId: string;
  customerId: string;
  shopVehicleId: string;
  kind: ActivityKind;
}) {
  const read = useServerFn(getCustomerVehicleActivity);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const source = sources[kind];
  const query = useQuery({
    queryKey: [
      "shop-manager",
      accountId,
      "customer",
      customerId,
      "vehicle",
      shopVehicleId,
      "activity",
      kind,
    ],
    queryFn: ({ signal }) =>
      read({ data: { expectedAccountId: accountId, customerId, shopVehicleId, kind }, signal }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  // Hide older data during every revalidation, including errors and consent loss.
  // Matching cache keys are not an authorization or current-consent guarantee.
  const checking = refreshRequested || query.isPending || query.isFetching;
  const failed = query.isError || (query.data !== undefined && query.data.kind !== kind);
  function refresh() {
    // Hide existing rows in the click's own render, before query notifications batch.
    setRefreshRequested(true);
    void query.refetch().finally(() => setRefreshRequested(false));
  }
  return (
    <section aria-label={source.title}>
      <Card className="h-full shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              <h3 className="text-base">{source.title}</h3>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={refresh}
              aria-label={`Refresh ${source.title.toLowerCase()}`}
            >
              Refresh
            </Button>
          </div>
          <CardDescription>Up to 25 recent {source.limit}.</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p role="status" className="text-sm text-muted-foreground">
              Checking {source.title.toLowerCase()}…
            </p>
          ) : failed ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>Could not load {source.title.toLowerCase()}.</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry {source.title.toLowerCase()}
              </Button>
            </div>
          ) : !query.data?.available ? (
            <p className="text-sm text-muted-foreground">
              Activity is unavailable for this vehicle in the current session.
            </p>
          ) : query.data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{source.empty}</p>
          ) : (
            <>
              <ActivityRows result={query.data} />
              {query.data.rows.length > 25 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing the 25 most recent {source.limit}.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ActivitySelection({
  accountId,
  customerId,
  vehicles,
  vehiclesLoading,
  vehiclesError,
}: Props & { accountId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const selectId = useId();
  const matching = vehicles.filter((vehicle) => vehicle.customer_id === customerId);
  const choices = matching.filter(
    (vehicle) => matching.filter((other) => other.id === vehicle.id).length === 1,
  );
  const selected = choices.find((vehicle) => vehicle.id === selectedId);
  const canRead = !vehiclesLoading && !vehiclesError && selected !== undefined;
  useEffect(() => {
    if (selectedId && (!selected || vehiclesError)) setSelectedId("");
  }, [selectedId, selected, vehiclesError]);
  return (
    <section aria-label="Customer vehicle activity" className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>
              <h2 className="text-lg">Vehicle activity</h2>
            </CardTitle>
            <Badge variant="outline">Read only</Badge>
          </div>
          <CardDescription>
            Receipt purchases, shop-recorded installations and current work-order snapshots for one
            customer vehicle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-lg space-y-2">
            <label htmlFor={selectId} className="text-sm font-medium">
              Customer vehicle
            </label>
            <select
              id={selectId}
              value={selected?.id ?? ""}
              disabled={vehiclesLoading || vehiclesError || choices.length === 0}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a customer vehicle</option>
              {choices.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </div>
          {vehiclesLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading customer vehicles…
            </p>
          ) : vehiclesError ? (
            <p role="alert" className="text-sm">
              Could not load customer vehicles. Retry the customer vehicle list.
            </p>
          ) : choices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No customer vehicles are available for selection.
            </p>
          ) : !selected ? (
            <p className="text-sm text-muted-foreground">Select a vehicle to check its activity.</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Each list is a read-only snapshot checked when refreshed. Link or sharing changes may
            not appear until the next refresh. Purchases do not prove payment or installation;
            current work-order status is not a status-change history.
          </p>
        </CardContent>
      </Card>
      {canRead ? (
        <div key={selected.id} className="grid gap-4 xl:grid-cols-3">
          {(["receipts", "installations", "work_orders"] as const).map((kind) => (
            <ActivitySource
              key={kind}
              accountId={accountId}
              customerId={customerId}
              shopVehicleId={selected.id}
              kind={kind}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CustomerVehicleActivity(props: Props) {
  const { user } = useAuth();
  // No private child, selection state or query hooks mount while signed out.
  if (!user) return null;
  return (
    <ActivitySelection
      key={JSON.stringify([user.id, props.customerId])}
      accountId={user.id}
      {...props}
    />
  );
}
