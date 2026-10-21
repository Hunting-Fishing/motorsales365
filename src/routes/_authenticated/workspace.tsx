import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceShopSwitcher } from "@/components/shop-manager/shop-switcher";

/** The switch boundary discards former-shop forms and cache after confirmation. */
export const Route = createFileRoute("/_authenticated/workspace")({
  component: () => (
    <WorkspaceShopSwitcher>
      <Outlet />
    </WorkspaceShopSwitcher>
  ),
});
