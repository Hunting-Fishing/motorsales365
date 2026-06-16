// Shared multi-business discount ladder. Pure helper so both client and
// server code share the same math.
//
// Rule: the FIRST business pays full price. Each additional business gets
// a percent-off on its own plan, scaling with the count of active
// businesses already owned by the user.
//   2nd  → 10% off
//   3rd  → 15% off
//   4th+ → 20% off

export type MultiBizDiscount = {
  // 0-based index of this business among the user's owned active set.
  // 0 = first business (no discount), 1 = second, etc.
  ordinal: number;
  percentOff: number;
  label: string | null;
};

export function discountForOrdinal(ordinal: number): MultiBizDiscount {
  if (ordinal <= 0) return { ordinal: 0, percentOff: 0, label: null };
  if (ordinal === 1) return { ordinal, percentOff: 10, label: "10% multi-business discount" };
  if (ordinal === 2) return { ordinal, percentOff: 15, label: "15% multi-business discount" };
  return { ordinal, percentOff: 20, label: "20% multi-business discount" };
}

export function applyDiscount(amount: number, percentOff: number): number {
  if (!percentOff) return amount;
  return Math.round(amount * (1 - percentOff / 100) * 100) / 100;
}
