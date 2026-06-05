import { Link, useRouterState } from "@tanstack/react-router";

export type AdminGroupTab = { label: string; to: string };

/**
 * Top-of-page sibling navigation for grouped admin sections
 * (Referrals = QR codes + Redemptions, Activity = Reports + Inquiries + Audit log).
 * Keeps existing routes intact while presenting them as one workflow.
 */
export function AdminGroupTabs({ title, tabs }: { title: string; tabs: AdminGroupTab[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-2">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export const REFERRALS_TABS: AdminGroupTab[] = [
  { label: "Staff QR codes", to: "/admin/referrals" },
  { label: "Redemptions", to: "/admin/redemptions" },
];

export const ACTIVITY_TABS: AdminGroupTab[] = [
  { label: "Reports", to: "/admin/reports" },
  { label: "Service inquiries", to: "/admin/inquiries" },
  { label: "Audit log", to: "/admin/audit" },
];
