/**
 * Regression test: a stale/invalid persisted refresh token must not wedge the
 * app in a "Signing you in…" state. Supabase owns persisted-token validation;
 * the provider consumes its auth-state events. A null INITIAL_SESSION must
 * release loading, and a later fresh SIGNED_IN event must load roles with the
 * normal retry-on-flake behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

type AuthListener = (event: string, session: any) => void;
const listeners: AuthListener[] = [];

let rolesCallCount = 0;

const rolesTableBuilder = () => ({
  select: () => ({
    eq: (_col: string, _uid: string) => {
      rolesCallCount += 1;
      if (rolesCallCount === 1) {
        return Promise.reject(new Error("network flake"));
      }
      return Promise.resolve({
        data: [{ role: "user" }, { role: "admin" }],
        error: null,
      });
    },
  }),
});

const profilesTableBuilder = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () =>
        Promise.resolve({
          data: { seller_type: "private", full_name: "Test User" },
          error: null,
        }),
    }),
  }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
});

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: (cb: AuthListener) => {
          listeners.push(cb);
          // This is the listener-first equivalent of Supabase determining
          // that no usable persisted session exists after startup.
          queueMicrotask(() => cb("INITIAL_SESSION", null));
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  const i = listeners.indexOf(cb);
                  if (i >= 0) listeners.splice(i, 1);
                },
              },
            },
          };
        },
      },
      from: (table: string) => {
        if (table === "user_roles") return rolesTableBuilder();
        if (table === "profiles") return profilesTableBuilder();
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    },
  };
});

import { AuthProvider, useAuth } from "@/hooks/use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("auth bootstrap — stale refresh token recovery", () => {
  beforeEach(() => {
    rolesCallCount = 0;
    listeners.length = 0;
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });

  it("releases signed-out bootstrap and loads roles on the next fresh sign-in", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Supabase reports no usable initial session; the provider must release
    // the bootstrap spinner rather than trying to validate the token itself.
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);

    // A fresh sign-in then arrives. The first roles fetch flakes; the retry
    // with backoff (~1s) succeeds inside the per-attempt safety timeout.
    const freshSession = {
      user: { id: "user-123", email: "test@example.com", user_metadata: {} },
    };
    await act(async () => {
      for (const cb of listeners) cb("SIGNED_IN", freshSession);
    });

    await waitFor(
      () => {
        expect(result.current.user?.id).toBe("user-123");
        expect(result.current.effectiveRoles.sort()).toEqual(["admin", "user"]);
      },
      { timeout: 5000 },
    );

    expect(rolesCallCount).toBeGreaterThanOrEqual(2);
    expect(result.current.loading).toBe(false);
  });
});
