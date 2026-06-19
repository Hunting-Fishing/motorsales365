import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock toast & navigate side-effects.
const navigateMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => mockAuth }));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: any) => <div data-testid="site-layout">{children}</div>,
}));
vi.mock("@/components/admin/admin-notification-bell", () => ({
  AdminNotificationBell: () => null,
}));
vi.mock("@/hooks/use-admin-pending-counts", () => ({
  useAdminPendingCounts: () => ({ data: {} }),
  pendingCountForRoute: () => 0,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { mfa: { listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }) } } },
}));
vi.mock("@tanstack/react-router", async () => {
  const actual: any = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (cfg: any) => ({ ...cfg }),
    useNavigate: () => navigateMock,
    useRouterState: () => "/admin",
    Outlet: () => <div data-testid="outlet">CHILD</div>,
    Link: ({ children }: any) => <a>{children}</a>,
  };
});

// mutable mock state
let mockAuth: any = {};

// Import after mocks
import("@/routes/admin");
// Re-import for accessing the component
const mod = await import("@/routes/admin");
const AdminLayout = (mod as any).Route?.component ?? null;

describe("AdminLayout — route guard", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    toastErrorMock.mockClear();
  });

  it("redirects unauthenticated users to /login", async () => {
    mockAuth = { user: null, isAdmin: false, loading: false };
    render(<AdminLayout />);
    // Effect runs after render
    await new Promise((r) => setTimeout(r, 0));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/login" });
  });

  it("redirects non-admin staff to /dashboard with toast", async () => {
    mockAuth = { user: { id: "u1", email: "sales@x.com" }, isAdmin: false, loading: false };
    render(<AdminLayout />);
    await new Promise((r) => setTimeout(r, 0));
    expect(toastErrorMock).toHaveBeenCalledWith("Admin access required.");
    expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("renders the admin outlet for admins (365 staff bypass 2FA)", async () => {
    mockAuth = {
      user: { id: "u1", email: "boss@365motorsales.com" },
      isAdmin: true,
      loading: false,
    };
    render(<AdminLayout />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
