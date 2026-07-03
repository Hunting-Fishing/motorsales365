/**
 * Regression test: multiple overlapping refresh/sign-in cycles must:
 *   1. Show only the LATEST error state (not stale ones from earlier attempts).
 *   2. Cancel any pending role-load retry timers when a new session arrives or
 *      the user signs out, so we don't leak overlapping retry loops that could
 *      later mutate state for the wrong uid.
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

// Roles fetch: always reject so we can observe retry-timer scheduling and
// cancellation without needing to wait for successful loads.
let rolesCallsByUid: Record<string, number> = {};
const rolesTableBuilder = () => ({
  select: () => ({
    eq: (_col: string, uid: string) => {
      rolesCallsByUid[uid] = (rolesCallsByUid[uid] ?? 0) + 1;
      return Promise.reject(new Error("network flake"));
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
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
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
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    },
  };
});

import { AuthProvider, useAuth } from "@/hooks/use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function fire(event: string, session: any) {
  for (const cb of listeners) cb(event, session);
}

describe("auth — overlapping refresh attempts", () => {
  beforeEach(() => {
    rolesCallsByUid = {};
    listeners.length = 0;
    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("only the latest error surfaces and pending retries are cancelled", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Let bootstrap resolve as signed-out.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // 1) First sign-in for user A. Roles fetch will reject and schedule a
      //    backoff retry (~1s) — we do NOT advance timers yet.
      const sessionA = {
        user: { id: "user-A", email: "a@example.com", user_metadata: {} },
      };
      await act(async () => {
        fire("SIGNED_IN", sessionA);
        await Promise.resolve();
      });
      await waitFor(() => expect(rolesCallsByUid["user-A"]).toBe(1));

      // 2) Before the retry timer fires, an unexpected SIGNED_OUT lands
      //    (simulating refresh failure #1). This must set authError and
      //    cancel the pending retry for user-A.
      await act(async () => {
        fire("SIGNED_OUT", null);
        await Promise.resolve();
      });
      expect(result.current.authError).toBe("refresh_failed");

      // 3) A second sign-in for a DIFFERENT user immediately clears the
      //    error and starts a fresh role-load cycle for user-B.
      const sessionB = {
        user: { id: "user-B", email: "b@example.com", user_metadata: {} },
      };
      await act(async () => {
        fire("SIGNED_IN", sessionB);
        await Promise.resolve();
      });
      expect(result.current.authError).toBeNull();
      await waitFor(() => expect(rolesCallsByUid["user-B"]).toBe(1));

      // 4) Advance far past the 4s max backoff window. If user-A's retry
      //    had NOT been cancelled, we'd see additional calls against
      //    user-A here. With proper cancellation, only user-B's retries fire.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      const userACallsAfter = rolesCallsByUid["user-A"] ?? 0;
      expect(userACallsAfter).toBe(1);
      expect(rolesCallsByUid["user-B"]).toBeGreaterThanOrEqual(2);

      // 5) A second unexpected SIGNED_OUT lands — the latest error state
      //    must again be "refresh_failed" (not a stale value, not null).
      await act(async () => {
        fire("SIGNED_OUT", null);
        await Promise.resolve();
      });
      expect(result.current.authError).toBe("refresh_failed");
      expect(result.current.user).toBeNull();

      // 6) Advance again — user-B's retry loop must also be cancelled by
      //    the sign-out; no further role calls for user-B.
      const userBCallsBefore = rolesCallsByUid["user-B"] ?? 0;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(rolesCallsByUid["user-B"]).toBe(userBCallsBefore);
    } finally {
      vi.useRealTimers();
    }
  });
});
