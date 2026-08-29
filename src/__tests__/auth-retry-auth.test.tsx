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
const initialSession = {
  user: { id: "user-123", email: "t@example.com", user_metadata: {} },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: vi.fn((opts?: { scope?: string }) => {
        if (opts?.scope === "local") return signOutLocal();
        return Promise.resolve({ error: null });
      }),
      onAuthStateChange: (cb: AuthListener) => {
        listeners.push(cb);
        queueMicrotask(() => cb("INITIAL_SESSION", initialSession));
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

    // Listener-first bootstrap emits INITIAL_SESSION, then the first role
    // attempt fails and schedules a retry (~1s).
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

    expect(signOutLocal).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);
    expect(result.current.authError).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(assignSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth?next=%2Fdashboard"),
    );

    await new Promise((r) => setTimeout(r, 1500));
    expect(rolesCallCount).toBe(callsBeforeRetry);
  });
});
