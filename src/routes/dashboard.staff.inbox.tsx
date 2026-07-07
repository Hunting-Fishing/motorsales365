import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, MessageSquare, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStaffScope } from "@/hooks/use-staff-scope";
import { listStaffDmConversations } from "@/lib/staff-dms.functions";
import { StaffChatDialog } from "@/components/internal-staff/StaffChatDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/staff/inbox")({
  component: StaffInboxPage,
  head: () => ({
    meta: [
      { title: "Staff Inbox — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function initials(name: string | null, email: string | null) {
  const src = (name || email || "?").trim();
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StaffInboxPage() {
  const { user, loading } = useAuth();
  const { scope, loading: scopeLoading } = useStaffScope();
  const is365 = !!scope?.is365Staff;
  const fetchConvos = useServerFn(listStaffDmConversations);

  const { data: convos = [], isLoading, refetch } = useQuery({
    queryKey: ["staff-dm-conversations", user?.id],
    queryFn: () => fetchConvos(),
    enabled: !!user && is365,
    refetchInterval: 30_000,
  });

  const [openWith, setOpenWith] = useState<{ id: string; name: string } | null>(null);
  const totalUnread = useMemo(
    () => convos.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [convos],
  );

  if (loading || scopeLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm">Please sign in to view your staff inbox.</p>
      </div>
    );
  }

  if (!is365) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h1 className="text-lg font-semibold">Staff Inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This inbox is only available to internal 365 Motor Sales staff.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to staff">
            <Link to="/dashboard/staff">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Inbox className="h-5 w-5" /> Staff Inbox
              {totalUnread > 0 && (
                <Badge className="bg-primary text-primary-foreground">{totalUnread}</Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              Your direct messages with @365motorsales.com teammates.
            </p>
          </div>
        </div>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {isLoading && (
          <div className="p-6 text-sm text-muted-foreground">Loading conversations…</div>
        )}
        {!isLoading && convos.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-muted-foreground">
              Start a chat from the{" "}
              <Link to="/dashboard/team/members" className="underline">
                team page
              </Link>
              .
            </p>
          </div>
        )}
        {convos.map((c) => {
          const name = c.other_name || c.other_email || "Teammate";
          const unread = c.unread_count > 0;
          return (
            <button
              key={c.other_user_id}
              onClick={() =>
                setOpenWith({ id: c.other_user_id, name })
              }
              className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50"
            >
              <Avatar className="h-10 w-10">
                {c.other_avatar_url && <AvatarImage src={c.other_avatar_url} alt={name} />}
                <AvatarFallback>{initials(c.other_name, c.other_email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>
                    {name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(c.last_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-xs ${
                      unread ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c.last_from_me ? "You: " : ""}
                    {c.last_body}
                  </span>
                  {unread && (
                    <Badge className="shrink-0 bg-primary text-primary-foreground">
                      {c.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </Card>

      {openWith && (
        <StaffChatDialog
          open={!!openWith}
          onOpenChange={(o) => {
            if (!o) {
              setOpenWith(null);
              refetch();
            }
          }}
          otherUserId={openWith.id}
          otherName={openWith.name}
        />
      )}
    </div>
  );
}
