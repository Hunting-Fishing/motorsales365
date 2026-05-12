import { useAuth } from "@/hooks/use-auth";

export function SandboxBanner() {
  const { simulatedRoles, setSimulatedRoles, realIsAdmin } = useAuth();
  if (!realIsAdmin || !simulatedRoles || simulatedRoles.length === 0) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950 shadow">
      <span>
        Sandbox: simulating{" "}
        <span className="font-bold">{simulatedRoles.join(", ")}</span> — UI only, RLS unchanged.
      </span>
      <button
        onClick={() => setSimulatedRoles(null)}
        className="rounded-full bg-amber-950/10 px-2 py-0.5 font-semibold hover:bg-amber-950/20"
      >
        Exit simulation
      </button>
    </div>
  );
}
