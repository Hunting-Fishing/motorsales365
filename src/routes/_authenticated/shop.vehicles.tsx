import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Car, Loader2, Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

type V = {
  id: string;
  customer_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  last_service_date: string | null;
};

async function fetchVehicles(): Promise<V[]> {
  const { data, error } = await (smSupabase as any)
    .from("vehicles")
    .select("id,customer_id,make,model,year,vin,license_plate,color,last_service_date")
    .order("last_service_date", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as V[];
}

export const Route = createFileRoute("/_authenticated/shop/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles — Shop Manager" },
      { name: "description", content: "Customer vehicles serviced by your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VehiclesList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function VehiclesList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "vehicles", "list"],
    queryFn: fetchVehicles,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((v) =>
      [v.make, v.model, v.vin, v.license_plate, v.color].some((x) =>
        String(x ?? "").toLowerCase().includes(s),
      ),
    );
  }, [data, q]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Car className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Vehicles</h1>
              <p className="text-muted-foreground">Serviced vehicles across your customers.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by make, model, VIN, plate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {data.length === 0 ? "No vehicles yet." : "No vehicles match your search."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Last service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/shop/vehicles/$id"
                          params={{ id: v.id }}
                          className="text-primary hover:underline"
                        >
                          {[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.vin ?? "—"}</TableCell>
                      <TableCell>{v.license_plate ?? "—"}</TableCell>
                      <TableCell>{v.color ?? "—"}</TableCell>
                      <TableCell>
                        {v.last_service_date
                          ? new Date(v.last_service_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/shop">← Back to Shop Manager</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
