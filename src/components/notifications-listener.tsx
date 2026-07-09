import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime bridge: pops a toast for any new row in
 * `user_notifications` targeted at the signed-in user, and invalidates the
 * cached notifications list so bells/panels refresh.
 */
export function NotificationsListener() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);
          toast(row.title ?? "New notification", {
            description: row.body ?? undefined,
            action: row.link_url
              ? {
                  label: "Open",
                  onClick: () => {
                    window.location.href = row.link_url;
                  },
                }
              : undefined,
          });
          qc.invalidateQueries({ queryKey: ["user-notifications"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return null;
}
