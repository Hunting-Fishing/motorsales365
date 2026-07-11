import { useAuthContext } from '@/context/AuthContext';

/**
 * Singleton auth hook — reads from AuthProvider context.
 * No new Supabase listeners are created per usage.
 */
export function useAuthUser() {
  return useAuthContext();
}
