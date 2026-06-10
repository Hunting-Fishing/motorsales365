import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const queryKey = (userId: string | null | undefined) => ["user-blocks", userId ?? "anon"];

export function useBlockedUserIds() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: queryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_user_id,reason,created_at")
        .eq("blocker_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ids = useMemo(() => new Set((data ?? []).map((r) => r.blocked_user_id)), [data]);
  return { ids, blocks: data ?? [] };
}

export function useBlockUser() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const block = useMutation({
    mutationFn: async (params: { blockedUserId: string; reason?: string }) => {
      if (!user?.id) throw new Error("Sign in to block users.");
      if (user.id === params.blockedUserId) throw new Error("You can't block yourself.");
      const { error } = await supabase
        .from("user_blocks")
        .insert({
          blocker_id: user.id,
          blocked_user_id: params.blockedUserId,
          reason: params.reason ?? null,
        });
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(user?.id) }),
  });
  const unblock = useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user?.id) throw new Error("Sign in required.");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", blockedUserId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(user?.id) }),
  });
  return { block, unblock };
}
