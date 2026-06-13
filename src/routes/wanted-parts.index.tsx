import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { listPublicPartsWanted } from "@/lib/parts-wanted.functions";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/wanted-parts/")({
  component: PartsWantedBoard,
  head: () => ({
    meta: [
      { title: "Parts wanted — 365MotorSales" },
      {
        name: "description",
        content:
          "Buyers in the Philippines looking for specific parts and parting-out vehicles. Post your request and get auto-matched.",
      },
    ],
  }),
});

function PartsWantedBoard() {
  const list = useServerFn(listPublicPartsWanted);
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ make?: string; model?: string; year?: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    list({ data: { ...filters, limit: 50 } })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [filters, list]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Parts wanted board</h1>
          <p className="text-sm text-muted-foreground">
            Buyers looking for parts and parting-out vehicles. Have what they need? Reach out
            through the listing system.
          </p>
        </div>
        <Link
          to="/wanted-parts/new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Post a request
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        <input
          placeholder="Make"
          value={filters.make ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, make: e.target.value || undefined }))}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Model"
          value={filters.model ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value || undefined }))}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          placeholder="Year"
          value={filters.year ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))
          }
          className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No open requests match those filters yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {r.kind === "parting_out" ? "Parts/donor" : "Single part"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.year ?? "any year"} {r.make} {r.model}
                {r.engine_code ? ` · ${r.engine_code}` : ""}
              </p>
              {r.part_keywords?.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.part_keywords.slice(0, 6).join(", ")}
                </p>
              )}
              <p className="mt-2 text-xs">
                {r.budget_max_php ? `Up to ${formatPHP(Number(r.budget_max_php))}` : "Open budget"}
                {r.region ? ` · ${r.region}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
