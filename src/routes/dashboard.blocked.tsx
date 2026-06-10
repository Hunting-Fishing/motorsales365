import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserX, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useBlockUser } from "@/hooks/use-blocked-users";

export const Route = createFileRoute("/dashboard/blocked")({
  head: () => ({
    meta: [
      { title: "Blocked users — 365 MotorSales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BlockedUsersPage,
});

type Row = {
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
  profile: { full_name: string | null; business_name: string | null; avatar_url: string | null } | null;
};

function BlockedUsersPage() {
  const { user } = useAuth();
  const { unblock } = useBlockUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_user_id,reason,created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });
    const ids = (blocks ?? []).map((b) => b.blocked_user_id);
    let profilesById: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("id,full_name,business_name,avatar_url")
        .in("id", ids);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    setRows(
      (blocks ?? []).map((b) => ({
        blocked_user_id: b.blocked_user_id,
        reason: b.reason,
        created_at: b.created_at,
        profile: profilesById[b.blocked_user_id] ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleUnblock = async (id: string) => {
    try {
      await unblock.mutateAsync(id);
      toast.success("Seller unblocked.");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not unblock.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Blocked users</h1>
        <p className="text-sm text-muted-foreground">
          Listings from these users are hidden from your feeds and search results. Unblocking is
          immediate; they are never notified.
        </p>
      </div>
      {loading ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          You haven&apos;t blocked anyone.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border border-border bg-card">
          {rows.map((r) => {
            const name = r.profile?.business_name ?? r.profile?.full_name ?? "Seller";
            return (
              <li key={r.blocked_user_id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary">
                  {r.profile?.avatar_url ? (
                    <img src={r.profile.avatar_url} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <UserX className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/seller/$id"
                    params={{ id: r.blocked_user_id }}
                    className="font-medium hover:text-primary"
                  >
                    {name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    Blocked {new Date(r.created_at).toLocaleDateString()}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleUnblock(r.blocked_user_id)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Unblock
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
