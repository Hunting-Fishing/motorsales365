import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Undo2,
  EyeOff,
  Trash2,
  RotateCcw,
  Megaphone,
  StickyNote,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { listReportActions, type ReportActionRow } from "@/lib/report-actions.functions";

const ICONS: Record<string, any> = {
  accept: CheckCircle2,
  dismiss: XCircle,
  reverse: Undo2,
  hide_listing: EyeOff,
  delete_listing: Trash2,
  restore_listing: RotateCcw,
  publish_summary: Megaphone,
  unpublish_summary: Megaphone,
  note: StickyNote,
  dispute_overturn: Scale,
  dispute_uphold: Scale,
};

export function ReportHistory({
  reportId,
  refreshKey,
  onReverse,
}: {
  reportId: string;
  refreshKey: number;
  onReverse: (actionId: string) => void;
}) {
  const fn = useServerFn(listReportActions);
  const [rows, setRows] = useState<ReportActionRow[] | null>(null);

  useEffect(() => {
    let live = true;
    fn({ data: { reportId } })
      .then((r) => {
        if (live) setRows(r.actions);
      })
      .catch(() => {
        if (live) setRows([]);
      });
    return () => {
      live = false;
    };
  }, [reportId, refreshKey]);

  if (rows === null) {
    return <div className="text-xs text-muted-foreground">Loading history…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        No actions yet.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((r) => {
        const Icon = ICONS[r.action] ?? StickyNote;
        const delta = r.score_delta;
        const deltaColor =
          delta < 0
            ? "text-destructive"
            : delta > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground";
        const reversed = !!r.reversed_by_action_id;
        const canReverse =
          !reversed && (r.action === "accept" || r.action === "dismiss");
        return (
          <li
            key={r.id}
            className="flex gap-3 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold capitalize">
                  {r.action.replace(/_/g, " ")}
                </span>
                {r.listing_effect !== "none" && (
                  <Badge variant="outline" className="text-[10px]">
                    listing: {r.listing_effect}
                  </Badge>
                )}
                {delta !== 0 && (
                  <span className={`font-mono text-xs font-semibold ${deltaColor}`}>
                    {delta > 0 ? "+" : ""}
                    {delta}pts
                  </span>
                )}
                {reversed && (
                  <Badge variant="secondary" className="text-[10px]">
                    reversed
                  </Badge>
                )}
                {r.notified_poster && (
                  <Badge variant="outline" className="text-[10px]">
                    notified
                  </Badge>
                )}
              </div>
              {r.note && (
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {r.note}
                </p>
              )}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {r.actor_name || "Staff"} · {formatDate(r.created_at)}
                </span>
                {canReverse && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onReverse(r.id)}
                  >
                    <Undo2 className="mr-1 h-3 w-3" /> Reverse
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
