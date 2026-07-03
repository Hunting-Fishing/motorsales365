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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  it(
    "only the latest error surfaces and pending retries are cancelled",
    async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Bootstrap resolves as signed-out.
      await waitFor(() => expect(result.current.loading).toBe(false));

      // 1) Sign in as user-A → role fetch fails and schedules retry (~1s).
      const sessionA = {
        user: { id: "user-A", email: "a@example.com", user_metadata: {} },
      };
      await act(async () => {
        fire("SIGNED_IN", sessionA);
      });
      await waitFor(() => expect(rolesCallsByUid["user-A"]).toBe(1));

      // 2) Unexpected SIGNED_OUT lands before retry fires — must set
      //    authError=refresh_failed AND cancel the pending user-A retry.
      await act(async () => {
        fire("SIGNED_OUT", null);
      });
      expect(result.current.authError).toBe("refresh_failed");

      // 3) Immediate sign-in for a different user clears the error and
      //    starts a fresh retry loop for user-B.
      const sessionB = {
        user: { id: "user-B", email: "b@example.com", user_metadata: {} },
      };
      await act(async () => {
        fire("SIGNED_IN", sessionB);
      });
      expect(result.current.authError).toBeNull();
      await waitFor(() => expect(rolesCallsByUid["user-B"]).toBe(1));

      // 4) Wait past the first two backoff windows (~1s + ~2s = 3s). If
      //    user-A's retry were still armed we'd see additional user-A
      //    calls here; proper cancellation keeps the count at 1.
      await act(async () => {
        await sleep(3500);
      });
      expect(rolesCallsByUid["user-A"] ?? 0).toBe(1);
      expect(rolesCallsByUid["user-B"]).toBeGreaterThanOrEqual(2);

      // 5) A second unexpected SIGNED_OUT — the LATEST error must be
      //    refresh_failed (not stale, not cleared).
      await act(async () => {
        fire("SIGNED_OUT", null);
      });
      expect(result.current.authError).toBe("refresh_failed");
      expect(result.current.user).toBeNull();

      // 6) Advance again — user-B's retry loop must also be cancelled.
      const userBCallsBefore = rolesCallsByUid["user-B"] ?? 0;
      await act(async () => {
        await sleep(3000);
      });
      expect(rolesCallsByUid["user-B"]).toBe(userBCallsBefore);
      expect(rolesCallsByUid["user-A"] ?? 0).toBe(1);
    },
    20_000,
  );
});
