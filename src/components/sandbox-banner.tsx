import { useAuth } from "@/hooks/use-auth";

const SELLER_LABEL: Record<string, string> = {
  private: "Private seller",
  dealer: "Dealer",
  repair_shop: "Repair shop",
  insurance: "Insurance",
};

export function SandboxBanner() {
  const {
    simulatedRoles, setSimulatedRoles, realIsAdmin,
    simulatedSellerType, setSimulatedSellerType, isStaff,
  } = useAuth();
  const hasRoleSim = realIsAdmin && simulatedRoles && simulatedRoles.length > 0;
  const hasSellerSim = isStaff && !!simulatedSellerType;
  if (!hasRoleSim && !hasSellerSim) return null;
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950 shadow">
      {hasRoleSim && (
        <span className="flex items-center gap-2">
          Sandbox: simulating roles{" "}
          <span className="font-bold">{simulatedRoles!.join(", ")}</span>
          <button
            onClick={() => setSimulatedRoles(null)}
            className="rounded-full bg-amber-950/10 px-2 py-0.5 font-semibold hover:bg-amber-950/20"
          >
            Exit
          </button>
        </span>
      )}
      {hasSellerSim && (
        <span className="flex items-center gap-2">
          Viewing as{" "}
          <span className="font-bold">{SELLER_LABEL[simulatedSellerType!] ?? simulatedSellerType}</span>
          <button
            onClick={() => setSimulatedSellerType(null)}
            className="rounded-full bg-amber-950/10 px-2 py-0.5 font-semibold hover:bg-amber-950/20"
          >
            Exit
          </button>
        </span>
      )}
      <span className="opacity-75">UI only — RLS unchanged.</span>
    </div>
  );
}
