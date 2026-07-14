import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

type Appt = {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  advisor_id: string | null;
  date: string | null;
  duration: number | null;
  status: string | null;
  notes: string | null;
};

async function fetchAppts(): Promise<Appt[]> {
  const { data, error } = await (smSupabase as any)
    .from("appointments")
    .select("id,customer_id,vehicle_id,advisor_id,date,duration,status,notes")
    .order("date", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Appt[];
}

export const Route = createFileRoute("/_authenticated/shop/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Shop Manager" },
      { name: "description", content: "Upcoming shop appointments and schedule." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppointmentsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function keyDay(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function AppointmentsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "appointments", "list"],
    queryFn: fetchAppts,
  });
  const [showPast, setShowPast] = useState(false);

  const grouped = useMemo(() => {
    const now = Date.now();
    const filtered = data.filter((a) => {
      if (!a.date) return false;
      if (showPast) return true;
      return new Date(a.date).getTime() >= now - 24 * 3600 * 1000;
    });
    const map = new Map<string, { day: Date; items: Appt[] }>();
    for (const a of filtered) {
      const d = new Date(a.date!);
      const k = keyDay(d);
      const bucket = map.get(k) ?? { day: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [] };
      bucket.items.push(a);
      map.set(k, bucket);
    }
    return [...map.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [data, showPast]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Appointments</h1>
              <p className="text-muted-foreground">Upcoming schedule.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPast((v) => !v)}>
            {showPast ? "Hide past" : "Show past"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No {showPast ? "" : "upcoming "}appointments.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <Card key={keyDay(g.day)}>
                <CardHeader>
                  <CardTitle className="text-base">{fmtDay(g.day)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {g.items.map((a) => {
                    const t = new Date(a.date!);
                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm"
                      >
                        <div className="w-20 font-mono text-xs">
                          {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {a.notes ?? "Appointment"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.duration ? `${a.duration} min` : ""}
                          </div>
                        </div>
                        <Badge variant="outline">{a.status ?? "scheduled"}</Badge>
                        {a.vehicle_id ? (
                          <Link
                            to="/shop/vehicles/$id"
                            params={{ id: a.vehicle_id }}
                            className="text-primary text-xs hover:underline"
                          >
                            Vehicle
                          </Link>
                        ) : null}
                        {a.customer_id ? (
                          <Link
                            to="/shop/customers/$id"
                            params={{ id: a.customer_id }}
                            className="text-primary text-xs hover:underline"
                          >
                            Customer
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
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
