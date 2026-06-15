import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  title: string;
  effect: string;
  scoreEffect: string;
  reversible: boolean;
  disputable: boolean;
};

export function ReportActionInfo({ title, effect, scoreEffect, reversible, disputable }: Props) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`What does ${title} do?`}
        className="rounded-full p-0.5 text-muted-foreground/70 transition hover:bg-muted hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-72 text-xs">
        <div className="mb-1.5 text-sm font-semibold">{title}</div>
        <dl className="space-y-1.5">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              What it does
            </dt>
            <dd>{effect}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trust-score effect
            </dt>
            <dd>{scoreEffect}</dd>
          </div>
          <div className="flex gap-3 pt-1 text-[11px] text-muted-foreground">
            <span>{reversible ? "↺ Reversible" : "⚠ Not reversible"}</span>
            <span>{disputable ? "💬 Poster can dispute" : "— No dispute"}</span>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
