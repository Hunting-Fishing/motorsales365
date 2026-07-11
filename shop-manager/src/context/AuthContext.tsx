import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const AUTH_TIMEOUT_MS = 5000;
const ROLES_TIMEOUT_MS = 5000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRolesLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isManager: boolean;
  userRoles: string[];
  userId: string | null;
  userName: string | null;
  error: string | null;
  refetchRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef<(event: string, currentSession: Session | null) => void>();

  const applyRoles = (roleNames: string[]) => {
    setUserRoles(roleNames);
    setIsAdmin(roleNames.includes('admin'));
    setIsOwner(roleNames.includes('owner'));
    setIsManager(roleNames.includes('manager') || roleNames.includes('yard_manager'));
  };

  const fetchUserRoles = async (authUserId: string): Promise<void> => {
    setIsRolesLoading(true);
    try {
      const directRes: any = await withTimeout(
        supabase.from('user_roles').select(`roles (name)`).eq('user_id', authUserId),
        ROLES_TIMEOUT_MS,
        'user_roles lookup',
      );

      if (!directRes?.error && directRes?.data?.length) {
        const roleNames = directRes.data.map((i: any) => i.roles?.name).filter(Boolean) as string[];
        applyRoles(roleNames);
        return;
      }

      const profileRes: any = await withTimeout(
        supabase.from('profiles').select('id').or(`user_id.eq.${authUserId},id.eq.${authUserId}`).maybeSingle(),
        ROLES_TIMEOUT_MS,
        'profile lookup',
      );

      const profileId = profileRes?.data?.id;
      if (profileId && profileId !== authUserId) {
        const profileRoles: any = await withTimeout(
          supabase.from('user_roles').select(`roles (name)`).eq('user_id', profileId),
          ROLES_TIMEOUT_MS,
          'profile user_roles lookup',
        );
        if (!profileRoles?.error && profileRoles?.data?.length) {
          const roleNames = profileRoles.data.map((i: any) => i.roles?.name).filter(Boolean) as string[];
          applyRoles(roleNames);
          return;
        }
      }

      applyRoles([]);
    } catch (err) {
      // Never block the app — fall back to empty roles and log.
      console.warn('AuthProvider: role fetch failed/timeout:', err);
      applyRoles([]);
    } finally {
      setIsRolesLoading(false);
    }
  };

  // Keep handler in ref to avoid stale closures
  handlerRef.current = (event: string, currentSession: Session | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setError(null);
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setIsAuthenticated(!!currentSession);
    setUserId(currentSession?.user?.id ?? null);
    setUserName(currentSession?.user?.email ?? currentSession?.user?.user_metadata?.full_name ?? null);

    // Unblock the app as soon as we know the session — roles load in background.
    setIsLoading(false);

    if (currentSession?.user?.id) {
      void fetchUserRoles(currentSession.user.id);
    } else {
      applyRoles([]);
      setIsRolesLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Auth bootstrap timeout after', AUTH_TIMEOUT_MS, 'ms');
        setIsLoading(false);
        setError('Authentication took too long. Please refresh or try logging in again.');
      }
    }, AUTH_TIMEOUT_MS);

    const stableHandler = (event: string, currentSession: Session | null) => {
      if (isMounted) {
        handlerRef.current?.(event, currentSession);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(stableHandler);

    supabase.auth.getSession().then(({ data: { session: s }, error: e }) => {
      if (!isMounted) return;
      if (e) {
        console.error('AuthProvider: Error getting session:', e);
        setError('Failed to get session');
        setIsLoading(false);
      } else {
        stableHandler('INITIAL_SESSION', s);
      }
    }).catch((err) => {
      if (isMounted) {
        console.error('AuthProvider: Error in initial auth check:', err);
        setError('Authentication initialization failed');
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  const refetchRoles = useCallback(async () => {
    if (userId) {
      await fetchUserRoles(userId);
    }
  }, [userId]);

  const value: AuthState = {
    user, session, isLoading, isRolesLoading, isAuthenticated,
    isAdmin, isOwner, isManager, userRoles, userId, userName,
    error, refetchRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
