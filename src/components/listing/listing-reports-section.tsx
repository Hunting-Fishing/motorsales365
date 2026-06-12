import { AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useListingReportSummary } from "@/hooks/use-listing-report-summary";
import { formatDate } from "@/lib/format";

/**
 * Public-facing transparency section on a listing page. Shows aggregate
 * counts of user reports plus admin-curated summaries (like verified
 * reviews on Amazon). Reporter identity and raw report details are NEVER
 * shown — only summaries an admin has explicitly published.
 */
export function ListingReportsSection({ listingId }: { listingId: string }) {
  const { data, isLoading } = useListingReportSummary(listingId);
  if (isLoading || !data) return null;
  if (data.total === 0) return null;

  const categoryEntries = Object.entries(data.categories ?? {})
    .filter(([, c]) => Number(c) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <section
      id="user-reports"
      className="scroll-mt-24 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
      aria-labelledby="user-reports-heading"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="user-reports-heading" className="font-display text-lg font-semibold">
            User reports on this listing
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Counts include unverified user reports; only admin-reviewed notes appear in full below.
            Reporter identities are never published.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge className="bg-amber-500 text-white">
          {data.open_count} open
        </Badge>
        {data.resolved_count > 0 && (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {data.resolved_count} resolved
          </Badge>
        )}
        {categoryEntries.length > 0 && (
          <span className="text-muted-foreground">·</span>
        )}
        {categoryEntries.map(([cat, count]) => (
          <Badge key={cat} variant="outline" className="font-normal">
            {cat} · {count}
          </Badge>
        ))}
      </div>

      {data.public_notes.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {data.public_notes.map((note, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {note.category && (
                  <Badge variant="outline" className="font-medium">
                    {note.category}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  Admin note · {formatDate(note.made_public_at)}
                </span>
                {note.status === "resolved" && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> resolved
                  </Badge>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">{note.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Reports are with our moderation team. We publish a public note only after an admin
            reviews the report.
          </p>
        </div>
      )}
    </section>
  );
}
