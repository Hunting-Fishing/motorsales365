import { Link } from "@tanstack/react-router";
import { formatPHP } from "@/lib/format";

export function MatchCard({
  match,
  onDismiss,
}: {
  match: {
    id: string;
    score: number;
    matched_at: string;
    listing: {
      id: string;
      title: string;
      price_php: number | string;
      region: string | null;
      city: string | null;
      published_at: string | null;
    } | null;
    wanted: { title: string; make: string; model: string; year: number | null } | null;
  };
  onDismiss: (id: string) => void;
}) {
  if (!match.listing) return null;
  const l = match.listing;
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          {match.wanted && (
            <p className="text-xs text-muted-foreground">
              For: <span className="font-medium">{match.wanted.title}</span> · {match.wanted.year ?? ""}{" "}
              {match.wanted.make} {match.wanted.model}
            </p>
          )}
          <Link
            to="/listing/$id"
            params={{ id: l.id }}
            className="line-clamp-2 font-medium text-primary hover:underline"
          >
            {l.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPHP(Number(l.price_php))} · {l.city ?? ""} {l.region ?? ""} ·{" "}
            {new Date(match.matched_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Match {Number(match.score).toFixed(0)}
          </span>
          <button
            onClick={() => onDismiss(match.id)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
