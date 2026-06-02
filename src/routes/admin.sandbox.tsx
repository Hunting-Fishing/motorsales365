import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth, type AppRole, type SellerType } from "@/hooks/use-auth";
import { useFeatureFlags, FEATURE_FLAG_META } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/sandbox")({
  component: SandboxPage,
});

const ALL_ROLES: AppRole[] = ["admin", "sales", "moderator", "support", "advertising", "user"];
const SELLER_TYPES: { value: SellerType; label: string }[] = [
  { value: "private", label: "Private seller" },
  { value: "dealer", label: "Dealer" },
  { value: "repair_shop", label: "Repair shop" },
  { value: "insurance", label: "Insurance" },
];

function SandboxPage() {
  const {
    user,
    realRoles,
    effectiveRoles,
    realIsAdmin,
    simulatedRoles,
    setSimulatedRoles,
    isStaff,
    realSellerType,
    effectiveSellerType,
    simulatedSellerType,
    setSimulatedSellerType,
  } = useAuth();
  const { flags, setFlag, setAll, reset } = useFeatureFlags();

  const current = new Set<AppRole>(simulatedRoles ?? realRoles);
  const toggleSim = (role: AppRole) => {
    const next = new Set(current);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    setSimulatedRoles(Array.from(next));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Sandbox</h1>
        <p className="text-sm text-muted-foreground">
          Admin-only testing playground. Simulate roles and toggle feature flags on this device.
          Nothing here changes the database or grants real privileges.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Role simulator</h2>
            <p className="text-xs text-muted-foreground">
              UI only — RLS still enforces your real database role ({realRoles.join(", ") || "user"}
              ).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSimulatedRoles(null);
              toast.success("Restored real roles");
            }}
            disabled={!simulatedRoles}
          >
            Reset to my real roles
          </Button>
        </div>

        {!realIsAdmin && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            Only real admins can simulate roles. Your simulated selection will be ignored.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => {
            const active = current.has(role);
            return (
              <button
                key={role}
                onClick={() => toggleSim(role)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {active ? "✓ " : "+ "}
                {role}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-semibold text-foreground">Real roles:</span>{" "}
            {realRoles.join(", ") || "user"}
          </div>
          <div>
            <span className="font-semibold text-foreground">Effective roles:</span>{" "}
            {effectiveRoles.join(", ") || "user"}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Seller-type simulator</h2>
            <p className="text-xs text-muted-foreground">
              Preview the app as a Private seller, Dealer, Repair shop, or Insurance account so you
              can guide users through their screens. UI only — RLS unchanged.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSimulatedSellerType(null);
              toast.success("Restored real seller type");
            }}
            disabled={!simulatedSellerType}
          >
            Reset
          </Button>
        </div>

        {!isStaff && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            Only staff (admin, sales, support, moderator, advertising) can simulate seller types.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {SELLER_TYPES.map(({ value, label }) => {
            const active = (simulatedSellerType ?? realSellerType) === value;
            return (
              <button
                key={value}
                onClick={() => setSimulatedSellerType(value === realSellerType ? null : value)}
                disabled={!isStaff}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {active ? "✓ " : "+ "}
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-semibold text-foreground">Real seller type:</span>{" "}
            {realSellerType}
          </div>
          <div>
            <span className="font-semibold text-foreground">Effective seller type:</span>{" "}
            {effectiveSellerType}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Feature flags</h2>
            <p className="text-xs text-muted-foreground">
              Toggle on/off to preview gated UI. Saved per device.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAll(true)}>
              Enable all
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll(false)}>
              Disable all
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {FEATURE_FLAG_META.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </div>
              <Switch checked={flags[f.key]} onCheckedChange={(v) => setFlag(f.key, v)} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">My account</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">User ID</dt>
            <dd className="font-mono">{user?.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd>{user?.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
