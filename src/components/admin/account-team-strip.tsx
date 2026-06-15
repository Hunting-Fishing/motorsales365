import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  listAccountTeammates,
  type TeammateRow,
} from "@/lib/admin-user-dossier.functions";
import { UserDossierDialog } from "./user-dossier-dialog";
import { getUserAdminDossier } from "@/lib/admin-user-dossier.functions";

function bandClasses(band: TeammateRow["trust_band"]) {
  if (band === "high") return "border-emerald-500/40 bg-emerald-500/5";
  if (band === "mid") return "border-amber-500/40 bg-amber-500/5";
  return "border-destructive/40 bg-destructive/5";
}
function BandIcon({ band }: { band: TeammateRow["trust_band"] }) {
  if (band === "high") return <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  if (band === "mid") return <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
  return <ShieldAlert className="h-3.5 w-3.5 text-destructive" />;
}

export function AccountTeamStrip({ userId }: { userId: string }) {
  const fn = useServerFn(listAccountTeammates);
  const { data, isLoading } = useQuery({
    queryKey: ["account-team", userId],
    queryFn: () => fn({ data: { userId } }),
    staleTime: 60_000,
  });
  const [expanded, setExpanded] = useState(false);
  const [drill, setDrill] = useState<TeammateRow | null>(null);

  if (isLoading) {
    return <Skeleton className="mt-3 h-16 w-full" />;
  }
  if (!data?.organization || (data.teammates?.length ?? 0) < 2) return null;

  const { organization, teammates } = data;
  const visible = expanded ? teammates : teammates.slice(0, 6);

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Account team
        </span>
        <span className="text-sm font-medium text-foreground">{organization.name}</span>
        {organization.kind && (
          <Badge variant="outline" className="text-[10px] capitalize">
            {String(organization.kind).replace(/_/g, " ")}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">
          {teammates.length} member{teammates.length === 1 ? "" : "s"}
        </Badge>
        {teammates.length > 6 && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2 text-xs"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" /> Show all {teammates.length}
              </>
            )}
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {visible.map((m) => (
          <button
            key={m.user_id}
            type="button"
            onClick={() => !m.is_focus && setDrill(m)}
            disabled={m.is_focus}
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-left transition ${bandClasses(
              m.trust_band,
            )} ${
              m.is_focus
                ? "ring-2 ring-primary/60 cursor-default"
                : "hover:bg-background/80 cursor-pointer"
            }`}
            title={
              m.is_focus
                ? "Focus user (this report)"
                : `Open dossier · joined ${m.joined_at ? formatDate(m.joined_at) : "—"}`
            }
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[10px] font-bold">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                m.display_name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-medium text-foreground">
                  {m.display_name}
                </span>
                {m.member_number != null && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    #{m.member_number.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <BandIcon band={m.trust_band} />
                <span className="font-semibold">{m.trust_score}</span>
                <span>·</span>
                <span className="capitalize">{m.role}</span>
                {m.reports_against > 0 && (
                  <>
                    <span>·</span>
                    <span className={m.reports_taken_down > 0 ? "text-destructive" : "text-amber-600"}>
                      {m.reports_against} report{m.reports_against === 1 ? "" : "s"}
                      {m.reports_taken_down > 0 ? ` (${m.reports_taken_down} down)` : ""}
                    </span>
                  </>
                )}
                {m.is_focus && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-primary">focus</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {drill && (
        <TeammateDossierLoader
          userId={drill.user_id}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

function TeammateDossierLoader({ userId, onClose }: { userId: string; onClose: () => void }) {
  const fn = useServerFn(getUserAdminDossier);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-dossier", userId],
    queryFn: () => fn({ data: { userId } }),
    staleTime: 60_000,
  });
  if (isLoading || !data) return null;
  return (
    <UserDossierDialog
      open={true}
      onOpenChange={(v) => !v && onClose()}
      userId={userId}
      identity={data.identity}
      stats={data.stats}
      score={data.score}
    />
  );
}
