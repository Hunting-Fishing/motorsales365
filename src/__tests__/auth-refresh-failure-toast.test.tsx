/**
 * Regression test: when Supabase emits TOKEN_REFRESHED with a null session
 * (refresh_token flow failed), the auth hook must:
 *   1) surface a persistent red toast (sonner) with a "Try again" action,
 *   2) clear the local session synchronously before navigating,
 *   3) navigate to /auth?next=<current path> so the user can re-authenticate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

// ---- Sonner toast spy ----------------------------------------------------
const toastError = vi.fn(() => "toast-id-1");
const toastDismiss = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string, opts: any) => toastError(msg, opts),
    dismiss: (id: any) => toastDismiss(id),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

// ---- Supabase mocks ------------------------------------------------------
type AuthListener = (event: string, session: any) => void;
const listeners: AuthListener[] = [];
const signOutLocal = vi.fn().mockResolvedValue({ error: null });

const rolesTable = () => ({
  select: () => ({
    eq: () =>
      Promise.resolve({ data: [{ role: "user" }], error: null }),
  }),
});
const profilesTable = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () =>
        Promise.resolve({
          data: { seller_type: "private", full_name: "T" },
          error: null,
        }),
    }),
  }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "u1", email: "u@x.com", user_metadata: {} } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { id: "u1", email: "u@x.com", user_metadata: {} } },
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
      if (table === "user_roles") return rolesTable();
      if (table === "profiles") return profilesTable();
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    },
  },
}));

import { AuthProvider, useAuth } from "@/hooks/use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("auth — refresh_token failure surfaces toast + Try again flow", () => {
  beforeEach(() => {
    listeners.length = 0;
    signOutLocal.mockClear();
    toastError.mockClear();
    toastDismiss.mockClear();
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });

  it("shows red toast on refresh failure and Try again clears session then navigates to /auth?next=…", async () => {
    // Stub window.location so retryAuth's assign is observable.
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        pathname: "/dashboard/settings",
        search: "?tab=security",
        assign: assignSpy,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial signed-in bootstrap.
    await waitFor(() => expect(result.current.user?.id).toBe("u1"), { timeout: 3000 });
    expect(result.current.authError).toBeNull();

    // Simulate Supabase emitting TOKEN_REFRESHED with a null session,
    // i.e. the refresh_token exchange failed.
    await act(async () => {
      for (const cb of listeners) cb("TOKEN_REFRESHED", null);
    });

    // 1) authError transitions to refresh_failed, session cleared.
    await waitFor(() => expect(result.current.authError).toBe("refresh_failed"));
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);

    // 2) Sonner red toast was raised with a "Try again" action.
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    const [msg, opts] = toastError.mock.calls[0] as [string, any];
    expect(msg).toMatch(/session expired/i);
    expect(opts.duration).toBe(Infinity);
    expect(opts.action?.label).toBe("Try again");
    expect(typeof opts.action?.onClick).toBe("function");

    // 3) Invoke the "Try again" action → retryAuth runs.
    await act(async () => {
      await opts.action.onClick();
      // retryAuth awaits signOut internally; give microtasks a tick.
      await Promise.resolve();
    });

    // Local sign-out was called and the session is cleared before nav.
    expect(signOutLocal).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toBeNull();

    // 4) Navigation went to /auth?next=<encoded current path+search>.
    expect(assignSpy).toHaveBeenCalledTimes(1);
    const target = assignSpy.mock.calls[0][0] as string;
    expect(target).toBe(
      `/auth?next=${encodeURIComponent("/dashboard/settings?tab=security")}`,
    );
  });
});
