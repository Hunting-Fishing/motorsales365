import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Users2, Search, Plus } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_fleet: boolean | null;
  created_at: string | null;
};

async function fetchCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await (smSupabase as any)
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, city, state, is_fleet, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

export const Route = createFileRoute("/_authenticated/workspace/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Shop Manager" },
      {
        name: "description",
        content: "Customer directory with household + vehicle history.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomersList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="mt-2 text-destructive">
          {String((error as any)?.message ?? error)}
        </p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Not found.</div>
    </SiteLayout>
  ),
});

function CustomersList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "customers", "list"],
    queryFn: fetchCustomers,
  });
  const [q, setQ] = useState("");

  const filtered = data.filter((c) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.city,
      c.state,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users2 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="text-muted-foreground">
                Your shop's customer directory.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone…"
                className="pl-9"
              />
            </div>
            <Button asChild>
              <Link to="/workspace/customers/new">
                <Plus className="mr-2 h-4 w-4" /> New
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No customers yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Once your shop starts logging customers they'll appear here.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          to="/workspace/customers/$id"
                          params={{ id: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
                            "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{c.is_fleet ? "Fleet" : "Retail"}</TableCell>
                      <TableCell>
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}
