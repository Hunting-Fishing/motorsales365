import { Check, Minus, X, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Cell, CompetitorMatrix, Competitor } from "@/data/competitors-shop-software";

function CellPill({ c }: { c: Cell }) {
  if (c.v === "yes")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Yes
      </span>
    );
  if (c.v === "partial")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Minus className="h-3 w-3" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <X className="h-3 w-3" /> —
    </span>
  );
}

function fmtUsd(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function priceCell(c: Competitor) {
  const p = c.pricing;
  if (p.unit === "free") return { text: "Free", tone: "primary" as const };
  if (p.startingUsd == null) return { text: "Ask", tone: "muted" as const };
  const start = fmtUsd(p.startingUsd);
  if (p.topUsd != null && p.topUsd > p.startingUsd) {
    return { text: `${start}–${fmtUsd(p.topUsd)}/${p.unit}`, tone: "muted" as const };
  }
  return { text: `${start}/${p.unit}`, tone: "muted" as const };
}

export function ComparisonTable({ matrix }: { matrix: CompetitorMatrix }) {
  // Widen min column width when many competitors — keep table readable, scroll horizontally.
  const colCount = matrix.competitors.length;
  const minWidth = 220 + colCount * 140;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead>
            <tr className="bg-gradient-to-r from-secondary/60 via-secondary/40 to-secondary/60">
              <th className="sticky left-0 z-20 min-w-[220px] border-b bg-secondary/60 p-3 text-left font-semibold backdrop-blur">
                Capability
              </th>
              {matrix.competitors.map((c) => {
                const is365 = c.id === "365";
                return (
                  <th
                    key={c.id}
                    className={`relative min-w-[140px] border-b p-3 text-center font-semibold ${
                      is365 ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    {is365 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow">
                        <Sparkles className="mr-0.5 inline h-2.5 w-2.5" /> You are here
                      </span>
                    )}
                    <div>{c.name}</div>
                    <div className={`text-xs font-normal ${is365 ? "text-primary/80" : "text-muted-foreground"}`}>
                      {c.blurb}
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Starting price row */}
            <tr className="bg-secondary/25">
              <th
                scope="row"
                className="sticky left-0 z-10 border-b bg-secondary/50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur"
              >
                Price range
              </th>
              {matrix.competitors.map((c) => {
                const is365 = c.id === "365";
                const pc = priceCell(c);
                return (
                  <td key={c.id} className={`border-b p-3 text-center ${is365 ? "bg-primary/5" : ""}`}>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pc.tone === "primary"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {pc.text}
                    </span>
                    {c.pricing.highest && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">up to {c.pricing.highest}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((r, i) => (
              <tr
                key={r.capability}
                className={`transition-colors hover:bg-secondary/30 ${i % 2 ? "bg-secondary/10" : ""}`}
              >
                <td
                  className={`sticky left-0 z-10 border-b p-3 font-medium backdrop-blur ${
                    i % 2 ? "bg-secondary/40" : "bg-card"
                  }`}
                >
                  {r.capability}
                </td>
                {matrix.competitors.map((c) => {
                  const cell = r.cells[c.id];
                  const is365 = c.id === "365";
                  if (!cell)
                    return (
                      <td key={c.id} className={`border-b p-3 text-center ${is365 ? "bg-primary/5" : ""}`}>
                        —
                      </td>
                    );
                  const inner = <CellPill c={cell} />;
                  return (
                    <td
                      key={c.id}
                      className={`border-b p-3 text-center ${is365 ? "bg-primary/5" : ""}`}
                    >
                      {cell.note ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{inner}</span>
                          </TooltipTrigger>
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
