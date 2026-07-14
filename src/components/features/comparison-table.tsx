import { Check, Minus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Cell, CompetitorMatrix } from "@/data/competitors-shop-software";

function CellIcon({ c }: { c: Cell }) {
  if (c.v === "yes") return <Check className="h-4 w-4 text-emerald-500" />;
  if (c.v === "partial") return <Minus className="h-4 w-4 text-amber-500" />;
  return <X className="h-4 w-4 text-muted-foreground/60" />;
}

export function ComparisonTable({ matrix }: { matrix: CompetitorMatrix }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="p-3 text-left font-semibold">Capability</th>
              {matrix.competitors.map((c) => (
                <th
                  key={c.id}
                  className={`p-3 text-center font-semibold ${c.id === "365" ? "text-primary" : ""}`}
                >
                  <div>{c.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{c.blurb}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((r, i) => (
              <tr key={r.capability} className={i % 2 ? "bg-secondary/20" : ""}>
                <td className="p-3 font-medium">{r.capability}</td>
                {matrix.competitors.map((c) => {
                  const cell = r.cells[c.id];
                  if (!cell) return <td key={c.id} className="p-3 text-center">—</td>;
                  const inner = (
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                        c.id === "365" && cell.v === "yes" ? "bg-primary/15" : ""
                      }`}
                    >
                      <CellIcon c={cell} />
                    </span>
                  );
                  return (
                    <td key={c.id} className="p-3 text-center">
                      {cell.note ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{inner}</TooltipTrigger>
                          <TooltipContent>{cell.note}</TooltipContent>
                        </Tooltip>
                      ) : (
                        inner
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
