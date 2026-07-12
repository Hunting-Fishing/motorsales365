import { CheckCircle2, RotateCcw } from "lucide-react";

interface Props {
  kind: string | null;
  body: string | null;
}

export function SystemBubble({ kind, body }: Props) {
  const Icon = kind === "listing_sold" ? CheckCircle2 : RotateCcw;
  return (
    <div className="my-2 flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{body ?? "System update"}</span>
      </div>
    </div>
  );
}
