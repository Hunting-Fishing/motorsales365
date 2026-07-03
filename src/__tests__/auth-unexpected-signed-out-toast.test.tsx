/**
 * Regression test: an unexpected SIGNED_OUT event (not initiated by our own
 * signOut/retryAuth) — e.g. Supabase revoked the session server-side —
 * must:
 *   1) surface a persistent red sonner toast with a "Try again" action,
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
const toastError = vi.fn<(msg: string, opts: any) => string>(() => "toast-id-1");
const toastDismiss = vi.fn<(id: any) => void>();
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

describe("auth — unexpected SIGNED_OUT surfaces toast + Try again flow", () => {
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

  it("shows red toast on unexpected SIGNED_OUT and Try again clears session then navigates to /auth?next=…", async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        pathname: "/dashboard/listings",
        search: "?filter=active",
        assign: assignSpy,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial signed-in bootstrap.
    await waitFor(() => expect(result.current.user?.id).toBe("u1"), { timeout: 3000 });
    expect(result.current.authError).toBeNull();

    // Simulate Supabase emitting SIGNED_OUT that we did NOT initiate.
    await act(async () => {
      for (const cb of listeners) cb("SIGNED_OUT", null);
    });

    // 1) authError transitions to refresh_failed, session cleared.
    await waitFor(() => expect(result.current.authError).toBe("refresh_failed"));
    expect(result.current.user).toBeNull();
    expect(result.current.effectiveRoles).toEqual([]);

    // 2) Sonner red toast raised with a "Try again" action.
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    const [msg, opts] = toastError.mock.calls[0] as [string, any];
    expect(msg).toMatch(/session expired/i);
    expect(opts.duration).toBe(Infinity);
    expect(opts.action?.label).toBe("Try again");
    expect(typeof opts.action?.onClick).toBe("function");

    // 3) Invoke the "Try again" action → retryAuth runs.
    await act(async () => {
      await opts.action.onClick();
      await Promise.resolve();
    });

    expect(signOutLocal).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toBeNull();

    // 4) Navigation went to /auth?next=<encoded current path+search>.
    expect(assignSpy).toHaveBeenCalledTimes(1);
    const target = assignSpy.mock.calls[0][0] as string;
    expect(target).toBe(
      `/auth?next=${encodeURIComponent("/dashboard/listings?filter=active")}`,
    );
  });
});
