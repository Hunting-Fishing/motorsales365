import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

/**
 * Small footer under a user's intent badge on /admin/users that shows when the
 * signup_intent was last evaluated and by whom.
 *
 * Derivation:
 *  - `evaluatedAt` is null → render nothing (never evaluated).
 *  - `evaluatedBy` is null → "Auto" badge (system trigger).
 *  - `evaluatedBy` is a uuid → "Manual" badge (admin), with the evaluator name.
 *
 * Each badge links to the matching /admin/audit filter for this user.
 */
export function IntentEvaluatedFooter({
  userId,
  evaluatedAt,
  evaluatedBy,
  evaluatorName,
}: {
  userId: string;
  evaluatedAt: string | null | undefined;
  evaluatedBy: string | null | undefined;
  evaluatorName: string | null | undefined;
}) {
  if (!evaluatedAt) return null;

  const isManual = !!evaluatedBy;
  // When the evaluator's profile name can't be resolved, fall back to a
  // clear human label ("an admin") rather than a raw uuid fragment so the
  // footer never renders "by 8chars…" or an empty "by ".
  const trimmedName = evaluatorName?.trim() ? evaluatorName.trim() : null;
  const displayName = trimmedName ?? (isManual ? "an admin" : null);

  return (
    <div
      data-testid="intent-evaluated-footer"
      className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      <span>Intent evaluated {formatDate(evaluatedAt)}</span>
      {isManual ? (
        <>
          <Link
            to="/admin/audit"
            search={{ action: "intent_recomputed_manual", q: userId }}
            title="View manual intent recompute entries for this user"
          >
            <Badge
              variant="outline"
              data-testid="intent-source-badge"
              data-source="manual"
              className="h-4 px-1 text-[10px] hover:bg-accent"
            >
              Manual
            </Badge>
          </Link>
          <span>
            by <span className="font-medium text-foreground">{displayName}</span>
          </span>
        </>
      ) : (
        <>
          <Link
            to="/admin/audit"
            search={{ action: "intent_recomputed_auto", q: userId }}
            title="View automatic intent recompute entries for this user"
          >
            <Badge
              variant="secondary"
              data-testid="intent-source-badge"
              data-source="auto"
              className="h-4 px-1 text-[10px] hover:bg-accent"
            >
              Auto
            </Badge>
          </Link>
          <span>by system trigger</span>
        </>
      )}
    </div>
  );
}
