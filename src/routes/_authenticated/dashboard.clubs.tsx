import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, BadgeCheck, Clock, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { listMyClubs } from "@/lib/clubs.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubDiscountNote } from "@/components/clubs/club-discount-note";

export const Route = createFileRoute("/_authenticated/dashboard/clubs")({
  head: () => ({ meta: [{ title: "My Clubs — 365 MotorSales" }] }),
  component: DashboardClubsPage,
});

function DashboardClubsPage() {
  const list = useServerFn(listMyClubs);
  const [owned, setOwned] = useState<any[]>([]);
  const [joined, setJoined] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await list();
        setOwned(r.owned);
        setJoined(r.joined);
      } finally {
        setLoading(false);
      }
    })();
  }, [list]);

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">My Clubs</h1>
          <Button asChild>
            <Link to="/clubs/apply">
              <Plus className="mr-2 h-4 w-4" /> Apply for a club
            </Link>
          </Button>
        </div>

        <div className="mt-4"><ClubDiscountNote /></div>



        {loading ? (
          <div className="mt-8 p-12 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <h2 className="font-display text-lg font-semibold">Clubs I own</h2>
              {owned.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't applied for a club yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {owned.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
                          {c.logo_url && (
                            <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {c.status === "active" && (
                              <Badge className="bg-emerald-600">
                                <BadgeCheck className="mr-1 h-3 w-3" /> Active
                              </Badge>
                            )}
                            {c.status === "pending" && (
                              <Badge variant="secondary">
                                <Clock className="mr-1 h-3 w-3" /> Pending review
                              </Badge>
                            )}
                            {c.status === "rejected" && (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" /> Rejected
                              </Badge>
                            )}
                            {c.status === "suspended" && (
                              <Badge variant="destructive">Suspended</Badge>
                            )}
                            <span className="text-muted-foreground">
                              {c.member_count} members
                            </span>
                          </div>
                          {c.review_notes && c.status !== "active" && (
                            <div className="mt-2 max-w-md text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Reviewer notes:</span>{" "}
                              {c.review_notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {c.status === "active" && (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/clubs/$slug" params={{ slug: c.slug }}>
                              View
                            </Link>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link to="/dashboard/clubs/$id" params={{ id: c.id }}>
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold">Clubs I've joined</h2>
              {joined.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't joined any clubs yet.{" "}
                  <Link to="/clubs" className="text-primary underline">
                    Browse clubs
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {joined.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
                          {c.logo_url && (
                            <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.my_role} · {c.member_count} members
                          </div>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/clubs/$slug" params={{ slug: c.slug }}>
                          View
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
