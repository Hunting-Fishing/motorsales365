import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

const SHOP_LOOKUP_TIMEOUT_MS = 6000;

// Module-level cache so every consumer shares one resolution per user.
type Entry = {
  promise: Promise<string | null> | null;
  value: string | null;
  error: Error | null;
  resolved: boolean;
};
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function notify(userId: string) {
  listeners.get(userId)?.forEach((l) => l());
}

function fetchShopId(userId: string): Promise<string | null> {
  const existing = cache.get(userId);
  if (existing?.resolved) return Promise.resolve(existing.value);
  if (existing?.promise) return existing.promise;

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Profile lookup timed out. Please retry.')),
      SHOP_LOOKUP_TIMEOUT_MS,
    ),
  );

  const query = supabase
    .from('profiles')
    .select('shop_id')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();

  const promise = Promise.race([query, timeout])
    .then((result: any) => {
      if (result?.error) throw result.error instanceof Error ? result.error : new Error(String(result.error));
      const value = (result?.data?.shop_id ?? null) as string | null;
      cache.set(userId, { promise: null, value, error: null, resolved: true });
      notify(userId);
      return value;
    })
    .catch((err) => {
      const error = err instanceof Error ? err : new Error('Failed to get shop ID');
      cache.set(userId, { promise: null, value: null, error, resolved: true });
      notify(userId);
      throw error;
    });

  cache.set(userId, { promise, value: null, error: null, resolved: false });
  return promise;
}

export function clearShopIdCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export function useShopId() {
  const { userId, isLoading: authLoading } = useAuthUser();
  const [, setTick] = useState(0);
  const tickRef = useRef(() => setTick((t) => t + 1));

  useEffect(() => {
    if (!userId) return;
    const set = listeners.get(userId) ?? new Set();
    set.add(tickRef.current);
    listeners.set(userId, set);
    return () => {
      set.delete(tickRef.current);
    };
  }, [userId]);

  useEffect(() => {
    if (authLoading || !userId) return;
    const entry = cache.get(userId);
    if (entry?.resolved || entry?.promise) return;
    fetchShopId(userId).catch(() => {});
  }, [userId, authLoading]);

  const refetch = useCallback(() => {
    if (!userId) return;
    cache.delete(userId);
    fetchShopId(userId).catch(() => {});
    tickRef.current();
  }, [userId]);

  if (!userId) {
    return { shopId: null, loading: authLoading, error: null, refetch };
  }

  const entry = cache.get(userId);
  const resolved = !!entry?.resolved;
  return {
    shopId: entry?.value ?? null,
    loading: authLoading || !resolved,
    error: entry?.error ?? null,
    refetch,
  };
}
