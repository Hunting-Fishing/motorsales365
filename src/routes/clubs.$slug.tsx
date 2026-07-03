import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, BadgePercent, CalendarRange, Globe, Mail, MapPin, Phone, ShieldCheck, Users } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { requestJoinClub, leaveClub, rsvpClubEvent } from "@/lib/clubs.functions";

export const Route = createFileRoute("/clubs/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any)
      .from("clubs")
      .select(
        "id,slug,name,type,description,verified,logo_url,cover_url,member_count,region,city,contact_email,contact_phone,website_url,status",
      )
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    if (!data) throw notFound();
    return { club: data };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.club;
    if (!c) return {};
    const title = `${c.name} — 365 MotorSales`;
    const desc = (c.description ?? "Verified motoring club on 365 MotorSales.").slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: c.name },
        { property: "og:description", content: desc },
        { property: "og:url", content: `https://www.365motorsales.com/clubs/${c.slug}` },
        ...(c.cover_url ? [{ property: "og:image", content: c.cover_url as string }] : []),
        ...(c.cover_url ? [{ property: "twitter:image", content: c.cover_url as string }] : []),
      ],
      links: [{ rel: "canonical", href: `https://www.365motorsales.com/clubs/${c.slug}` }],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center text-muted-foreground">
        {error.message}
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center">
        <h1 className="font-display text-2xl">Club not found</h1>
        <Button asChild className="mt-4">
          <Link to="/clubs">Back to clubs</Link>
        </Button>
      </div>
    </SiteLayout>
  ),
  component: ClubDetailPage,
});

const TYPE_LABEL: Record<string, string> = {
  motorcycle_riding: "Motorcycle riding",
  car_club: "Car club",
  off_road: "Off-road",
  truck_club: "Truck club",
  brand_owners: "Brand owners",
  general_motoring: "General motoring",
  other: "Other",
};

function ClubDetailPage() {
  const { club } = Route.useLoaderData();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const joinFn = useServerFn(requestJoinClub);
  const leaveFn = useServerFn(leaveClub);
  const rsvpFn = useServerFn(rsvpClubEvent);

  async function refresh() {
    const [{ data: mems }, { data: evs }, { data: crs }] = await Promise.all([
      (supabase as any)
        .from("club_members")
        .select("user_id,role,status,joined_at")
        .eq("club_id", club.id)
        .eq("status", "active")
        .limit(60),
      (supabase as any)
        .from("club_events")
        .select("id,title,description,starts_at,meetup_location,cover_url,status")
        .eq("club_id", club.id)
        .in("status", ["scheduled"])
        .order("starts_at", { ascending: true })
        .limit(20),
      (supabase as any)
        .from("club_rides")
        .select("id, ride:rides(id,slug,name,cover_photo_url,year,make,model)")
        .eq("club_id", club.id)
        .limit(24),
    ]);
    setMembers(mems ?? []);
    setEvents(evs ?? []);
    setRides(crs ?? []);
    if (user) {
      const { data: mine } = await (supabase as any)
        .from("club_members")
        .select("status")
        .eq("club_id", club.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyStatus(mine?.status ?? null);
    } else {
      setMyStatus(null);
    }
  }

  useEffect(() => {
    refresh();
     
  }, [club.id, user?.id]);

  async function handleJoin() {
    if (!user) {
      toast.info("Sign in to join this club");
      return;
    }
    setBusy(true);
    try {
      const r = await joinFn({ data: { club_id: club.id } });
      setMyStatus(r.status);
      toast.success(r.status === "active" ? "You're in!" : "Join request sent");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    try {
      await leaveFn({ data: { club_id: club.id } });
      setMyStatus(null);
      toast.success("Left the club");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="relative bg-muted">
        <div className="aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {club.cover_url && (
            <img src={club.cover_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      </div>
      <div className="container mx-auto px-4">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-primary/10 text-primary">
                  <Users className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">{club.name}</h1>
                {club.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{TYPE_LABEL[club.type] ?? club.type}</Badge>
                {(club.city || club.region) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[club.city, club.region].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {club.member_count} members
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {myStatus === "active" ? (
              <Button variant="outline" onClick={handleLeave} disabled={busy}>
                Leave club
              </Button>
            ) : myStatus === "pending" ? (
              <Button variant="outline" disabled>
                Request pending
              </Button>
            ) : (
              <Button onClick={handleJoin} disabled={busy}>
                {user ? "Request to join" : "Sign in to join"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <h2 className="font-display text-lg font-semibold">About</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {club.description ?? "No description yet."}
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold">Upcoming events</h2>
              {events.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No upcoming rides or meets.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{ev.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarRange className="h-3 w-3" />
                              {new Date(ev.starts_at).toLocaleString()}
                            </span>
                            {ev.meetup_location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.meetup_location}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="mt-2 text-sm text-muted-foreground">{ev.description}</p>
                          )}
                        </div>
                        {myStatus === "active" && (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await rsvpFn({ data: { event_id: ev.id, response: "going" } });
                                  toast.success("RSVP: going");
                                } catch (e: any) {
                                  toast.error(e.message ?? "Failed");
                                }
                              }}
                            >
                              Going
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold">Member rides</h2>
              {rides.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Members haven't attached any rides yet.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {rides.map((cr) => {
                    const r = cr.ride;
                    if (!r) return null;
                    return (
                      <Link
                        key={cr.id}
                        to="/rides/$slug"
                        params={{ slug: r.slug }}
                        className="group overflow-hidden rounded-lg border border-border bg-card"
                      >
                        <div className="aspect-video bg-muted">
                          {r.cover_photo_url && (
                            <img
                              src={r.cover_photo_url}
                              alt=""
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          )}
                        </div>
                        <div className="p-2 text-sm">
                          <div className="truncate font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[r.year, r.make, r.model].filter(Boolean).join(" ")}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            {club.verified && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <BadgePercent className="h-4 w-4" /> 5% off 365 ads, boosts & plans
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Active members of this verified club save 5% on internal 365 purchases: ad
                  packages, listing boosts, dealer bundles, business plans and Passport Premium.
                </p>
              </div>
            )}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" /> More group perks — coming soon
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                We're negotiating group rates for insurance, parts discounts and event access for
                verified clubs. Approved members get first access when perks launch.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="font-semibold">Contact</div>
              <div className="mt-2 space-y-1 text-muted-foreground">
                {club.contact_email && (
                  <a className="flex items-center gap-2 hover:text-foreground" href={`mailto:${club.contact_email}`}>
                    <Mail className="h-4 w-4" /> {club.contact_email}
                  </a>
                )}
                {club.contact_phone && (
                  <a className="flex items-center gap-2 hover:text-foreground" href={`tel:${club.contact_phone}`}>
                    <Phone className="h-4 w-4" /> {club.contact_phone}
                  </a>
                )}
                {club.website_url && (
                  <a
                    className="flex items-center gap-2 hover:text-foreground"
                    href={club.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="font-semibold">Members</div>
              <div className="mt-2 text-muted-foreground">
                {members.length === 0 ? "No active members yet." : `${club.member_count} active members`}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
