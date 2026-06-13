import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  listMyPartsWanted,
  listMyMatches,
  closePartsWanted,
  deletePartsWanted,
  dismissMatch,
} from "@/lib/parts-wanted.functions";
import { MatchCard } from "@/components/parts-wanted/match-card";

export const Route = createFileRoute("/_authenticated/dashboard/parts-wanted")({
  component: DashboardPartsWantedPage,
  head: () => ({ meta: [{ title: "My parts requests — 365MotorSales" }] }),
});

function DashboardPartsWantedPage() {
  const listWanted = useServerFn(listMyPartsWanted);
  const listMatches = useServerFn(listMyMatches);
  const close = useServerFn(closePartsWanted);
  const del = useServerFn(deletePartsWanted);
  const dismiss = useServerFn(dismissMatch);

  const [wanted, setWanted] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  async function refresh() {
    const [w, m] = await Promise.all([listWanted(), listMatches({ data: {} })]);
    setWanted(w);
    setMatches(m);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">My parts requests</h1>
          <p className="text-sm text-muted-foreground">
            We auto-watch new listings and notify you when something matches.
          </p>
        </div>
        <Link
          to="/wanted-parts/new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New request
        </Link>
      </header>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">
          New matches{" "}
          <span className="text-sm text-muted-foreground">({matches.length})</span>
        </h2>
        {matches.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No matches yet. We'll alert you the moment a listing fits one of your requests.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onDismiss={async (id) => {
                  await dismiss({ data: { id } });
                  toast.success("Dismissed");
                  refresh();
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">My open requests</h2>
        {wanted.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            You haven't posted a parts request yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {wanted.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.year ?? "any year"} {w.make} {w.model}
                    {w.engine_code ? ` · ${w.engine_code}` : ""} ·{" "}
                    {w.status === "open" ? "Open" : w.status}
                    {" · "}alerts: {w.alert_frequency}
                  </p>
                </div>
                <div className="flex gap-2">
                  {w.status === "open" && (
                    <button
                      onClick={async () => {
                        await close({ data: { id: w.id } });
                        toast.success("Closed");
                        refresh();
                      }}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Close
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this request?")) return;
                      await del({ data: { id: w.id } });
                      toast.success("Deleted");
                      refresh();
                    }}
                    className="rounded border border-border px-2 py-1 text-xs text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
