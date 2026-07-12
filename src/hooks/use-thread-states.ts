import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ThreadScope = "dm" | "group";

export interface ThreadState {
  scope: ThreadScope;
  key: string;
  starred: boolean;
  archived: boolean;
  muted: boolean;
  spam: boolean;
  color_label: string | null;
}

const EMPTY: ThreadState = {
  scope: "dm",
  key: "",
  starred: false,
  archived: false,
  muted: false,
  spam: false,
  color_label: null,
};

// DM key format: "<listingId>:<otherUserId>". Group: threadId.
export function dmKey(listingId: string, otherUserId: string) {
  return `${listingId}:${otherUserId}`;
}

export function useThreadStates() {
  const { user } = useAuth();
  const [states, setStates] = useState<Record<string, ThreadState>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from("message_thread_state" as any) as any)
      .select("scope,key,starred,archived,muted,spam,color_label")
      .eq("user_id", user.id);
    const map: Record<string, ThreadState> = {};
    ((data ?? []) as ThreadState[]).forEach((s) => {
      map[`${s.scope}:${s.key}`] = s;
    });
    setStates(map);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const get = useCallback(
    (scope: ThreadScope, key: string): ThreadState => {
      return states[`${scope}:${key}`] ?? { ...EMPTY, scope, key };
    },
    [states],
  );

  const patch = useCallback(
    async (scope: ThreadScope, key: string, updates: Partial<ThreadState>) => {
      if (!user) return;
      const current = states[`${scope}:${key}`] ?? { ...EMPTY, scope, key };
      const next = { ...current, ...updates };
      setStates((prev) => ({ ...prev, [`${scope}:${key}`]: next }));
      const { error } = await (supabase.from("message_thread_state" as any) as any).upsert({
        user_id: user.id,
        scope,
        key,
        starred: next.starred,
        archived: next.archived,
        muted: next.muted,
        spam: next.spam,
        color_label: next.color_label,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        // rollback
        setStates((prev) => ({ ...prev, [`${scope}:${key}`]: current }));
      }
    },
    [user, states],
  );

  const toggle = useCallback(
    (scope: ThreadScope, key: string, field: "starred" | "archived" | "muted" | "spam") => {
      const current = states[`${scope}:${key}`] ?? { ...EMPTY, scope, key };
      return patch(scope, key, { [field]: !current[field] } as Partial<ThreadState>);
    },
    [patch, states],
  );

  return { get, patch, toggle, reload: load };
}
