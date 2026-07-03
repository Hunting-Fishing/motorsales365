import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarPlus, Check, FileText, Users, X } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getMyClubDetail,
  respondToJoinRequest,
  createClubEvent,
} from "@/lib/clubs.functions";

export const Route = createFileRoute("/_authenticated/dashboard/clubs/$id")({
  head: () => ({ meta: [{ title: "Manage club — 365 MotorSales" }] }),
  component: ManageClubPage,
});

function ManageClubPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getMyClubDetail);
  const respondFn = useServerFn(respondToJoinRequest);
  const createEvFn = useServerFn(createClubEvent);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evForm, setEvForm] = useState({
    title: "",
    starts_at: "",
    meetup_location: "",
    description: "",
  });
  const [savingEv, setSavingEv] = useState(false);

  async function refresh() {
    try {
      const r = await getFn({ data: { id } });
      setData(r);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
     
  }, [id]);

  async function handleRespond(member_id: string, decision: "approve" | "reject") {
    try {
      await respondFn({ data: { member_id, decision } });
      toast.success(decision === "approve" ? "Approved" : "Removed");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evForm.title || !evForm.starts_at) {
      toast.error("Title and date required");
      return;
    }
    setSavingEv(true);
    try {
      await createEvFn({
        data: {
          club_id: id,
          title: evForm.title,
          starts_at: new Date(evForm.starts_at).toISOString(),
          meetup_location: evForm.meetup_location || null,
          description: evForm.description || null,
        },
      });
      toast.success("Event created");
      setEvForm({ title: "", starts_at: "", meetup_location: "", description: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSavingEv(false);
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-12 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (!data) return null;
  const { club, my_role, documents, members, pending_members, events } = data;
  const isAdmin = my_role === "owner" || my_role === "admin";

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 text-sm">
          <Link to="/dashboard/clubs" className="text-muted-foreground hover:text-foreground">
            ← My clubs
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{club.name}</h1>
          <Badge
            variant={club.status === "active" ? "default" : "secondary"}
            className={club.status === "active" ? "bg-emerald-600" : ""}
          >
            {club.status}
          </Badge>
          {club.status === "active" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/clubs/$slug" params={{ slug: club.slug }}>
                View public page
              </Link>
            </Button>
          )}
        </div>
        {club.review_notes && club.status !== "active" && (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <span className="font-semibold">Reviewer notes:</span> {club.review_notes}
          </div>
        )}

        {!isAdmin ? (
          <div className="mt-8 text-sm text-muted-foreground">
            You are a {my_role ?? "guest"} — only owners and admins can manage this club.
          </div>
        ) : (
          <Tabs defaultValue="members" className="mt-6">
            <TabsList>
              <TabsTrigger value="members">
                <Users className="mr-2 h-4 w-4" /> Members
                {pending_members.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pending_members.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="events">
                <CalendarPlus className="mr-2 h-4 w-4" /> Events
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" /> Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-6">
              {pending_members.length > 0 && (
                <section>
                  <h2 className="font-display text-lg font-semibold">Pending requests</h2>
                  <ul className="mt-2 space-y-2">
                    {pending_members.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-md border border-border bg-card p-3"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                            {m.profile?.avatar_url && (
                              <img
                                src={m.profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <span>
                            {m.profile?.business_name || m.profile?.full_name || "Anonymous"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(m.id, "approve")}
                          >
                            <Check className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespond(m.id, "reject")}
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h2 className="font-display text-lg font-semibold">Active members</h2>
                {members.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No active members yet.</p>
                ) : (
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {members.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm"
                      >
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                          {m.profile?.avatar_url && (
                            <img
                              src={m.profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 truncate">
                          {m.profile?.business_name || m.profile?.full_name || "Anonymous"}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {m.role}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <form
                onSubmit={handleCreateEvent}
                className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <Label>Event title</Label>
                  <Input
                    value={evForm.title}
                    onChange={(e) => setEvForm({ ...evForm, title: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label>Date & time</Label>
                  <Input
                    type="datetime-local"
                    value={evForm.starts_at}
                    onChange={(e) => setEvForm({ ...evForm, starts_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Meetup location</Label>
                  <Input
                    value={evForm.meetup_location}
                    onChange={(e) => setEvForm({ ...evForm, meetup_location: e.target.value })}
                    maxLength={300}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={evForm.description}
                    onChange={(e) => setEvForm({ ...evForm, description: e.target.value })}
                    maxLength={2000}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={savingEv}>
                    {savingEv ? "Creating…" : "Create event"}
                  </Button>
                </div>
              </form>

              <section>
                <h2 className="font-display text-lg font-semibold">Upcoming events</h2>
                {events.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No events yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {events.map((ev: any) => (
                      <li
                        key={ev.id}
                        className="rounded-md border border-border bg-card p-3 text-sm"
                      >
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.starts_at).toLocaleString()} · {ev.status}
                          {ev.meetup_location && ` · ${ev.meetup_location}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Accreditation documents submitted with your application. Only you and 365 admins
                can view these.
              </p>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents on file.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d: any) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {d.original_filename ?? d.storage_path.split("/").pop()}
                          </div>
                          <div className="text-xs text-muted-foreground">{d.kind}</div>
                        </div>
                      </div>
                      {d.signed_url && (
                        <a
                          href={d.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </SiteLayout>
  );
}
