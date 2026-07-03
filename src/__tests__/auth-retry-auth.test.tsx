/**
 * Regression test for `retryAuth`:
 *  - clears the local session via supabase.auth.signOut({ scope: "local" })
 *  - resets user/roles/authError so the header stops showing "Signing you in…"
 *  - cancels any pending role-load retry timer scheduled by loadRoles
 *  - navigates to /auth?next=... so the app re-bootstraps from a clean slate
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

// Roles query always rejects so loadRoles schedules a retry we can then cancel.
let rolesCallCount = 0;
const rolesTableBuilder = () => ({
  select: () => ({
    eq: () => {
      rolesCallCount += 1;
      return Promise.reject(new Error("network flake"));
    },
  }),
});
const profilesTableBuilder = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () =>
        Promise.resolve({ data: { seller_type: "private", full_name: "T" }, error: null }),
    }),
  }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
});

const signOutLocal = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "t@example.com", user_metadata: {} } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "t@example.com", user_metadata: {} },
          },
        },
        error: null,
      }),
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
}));

import { AuthProvider, useAuth } from "@/hooks/use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("retryAuth", () => {
  beforeEach(() => {
    rolesCallCount = 0;
    listeners.length = 0;
    signOutLocal.mockClear();
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });

  it("clears session, cancels pending role retries, and navigates to /auth", async () => {
    // Stub window.location.assign so retryAuth doesn't blow up jsdom.
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        pathname: "/dashboard",
        search: "",
        assign: assignSpy,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for bootstrap → user loaded → first roles attempt rejected →
    // retry scheduled (setTimeout ~1s).
    await waitFor(() => expect(result.current.user?.id).toBe("user-123"), {
      timeout: 3000,
    });
    await waitFor(() => expect(rolesCallCount).toBeGreaterThanOrEqual(1), {
      timeout: 3000,
    });

    const callsBeforeRetry = rolesCallCount;

    await act(async () => {
      await result.current.retryAuth();
    });

    // 1) Local sign-out happened.
    expect(signOutLocal).toHaveBeenCalledTimes(1);
    // 2) Session state cleared.
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);
    expect(result.current.authError).toBeNull();
    expect(result.current.loading).toBe(false);
    // 3) Redirect to /auth with preserved next param.
    expect(assignSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth?next=%2Fdashboard"),
    );

    // 4) Pending role retry timer was cancelled: no further roles calls
    //    should fire even after the original ~1s backoff elapses.
    await new Promise((r) => setTimeout(r, 1500));
    expect(rolesCallCount).toBe(callsBeforeRetry);
  });
});
