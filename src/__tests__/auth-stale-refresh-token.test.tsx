/**
 * Regression test: a stale/invalid refresh token persisted in localStorage
 * must not wedge the app in a "Signing you in…" state. The auth bootstrap
 * should clear the bad token via signOut({ scope: "local" }), then when a
 * fresh sign-in comes through onAuthStateChange, loadRoles should succeed
 * (with retry-on-flake) and rolesLoading should flip to false.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

// ---- Mocks ---------------------------------------------------------------

vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

type AuthListener = (event: string, session: any) => void;
const listeners: AuthListener[] = [];

// Track how many times the roles query has been attempted so we can simulate
// a flaky first call followed by success.
let rolesCallCount = 0;

const rolesTableBuilder = () => ({
  select: () => ({
    eq: (_col: string, _uid: string) => {
      rolesCallCount += 1;
      if (rolesCallCount === 1) {
        // First call: network-flake style rejection.
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
    // For the welcome-email profile lookup path.
  }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
});

const signOutLocal = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        // Simulate a stale refresh token: getUser rejects like supabase does
        // when the persisted refresh token is invalid.
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Invalid Refresh Token", status: 400 },
        }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn((opts?: { scope?: string }) => {
          if (opts?.scope === "local") return signOutLocal();
          return Promise.resolve({ error: null });
        }),
        onAuthStateChange: (cb: AuthListener) => {
          listeners.push(cb);
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

// Import AFTER mocks so the module picks up the mocked supabase client.
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ---- Test ----------------------------------------------------------------

describe("auth bootstrap — stale refresh token recovery", () => {
  beforeEach(() => {
    rolesCallCount = 0;
    listeners.length = 0;
    signOutLocal.mockClear();
  });

  it("clears the stale token and loads roles on next sign-in within the timeout window", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // 1) Bootstrap sees the stale token, calls signOut({ scope: "local" }),
    //    releases loading, and renders as signed-out.
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    expect(signOutLocal).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);

    // 2) A fresh sign-in fires via onAuthStateChange. The first roles fetch
    //    rejects (flake); the retry with backoff (~1s) then succeeds well
    //    inside the 8s per-attempt safety timeout.
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

    // Confirm the retry actually ran (>=2 attempts).
    expect(rolesCallCount).toBeGreaterThanOrEqual(2);
    expect(result.current.loading).toBe(false);
  });
});

