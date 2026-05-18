import { Building2, UserRound, Wrench, Search } from "lucide-react";
import { AccountTypeCard } from "./account-type-card";

export type SignupIntent = "buyer" | "private_seller" | "business" | "service_provider";

export const SIGNUP_TYPES: {
  id: SignupIntent;
  label: string;
  description: string;
  icon: typeof Search;
  badge?: string;
  note?: string;
}[] = [
  {
    id: "buyer",
    label: "Buyer & Private Seller",
    description: "Browse listings, save favorites, message sellers — and list your own vehicle, equipment, or parts when you're ready.",
    icon: UserRound,
    note: "This personal account lets you do both: shop the marketplace and post private listings from your dashboard. Pick a business account below if you sell professionally.",
  },
  {
    id: "business",
    label: "Business / Dealer",
    description: "Dealership, parts shop, or rental — listed in our professional directory.",
    icon: Building2,
    badge: "Popular for Pros",
  },
  {
    id: "service_provider",
    label: "Service provider",
    description: "Towing, repair, body shop, carwash, or salvage specialist.",
    icon: Wrench,
  },
];

interface Props {
  value: SignupIntent | null;
  onChange: (v: SignupIntent) => void;
}

export function AccountTypeGrid({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {SIGNUP_TYPES.map((t) => (
        <AccountTypeCard
          key={t.id}
          icon={t.icon}
          label={t.label}
          description={t.description}
          badge={t.badge}
          selected={value === t.id}
          onSelect={() => onChange(t.id)}
        />
      ))}
    </div>
  );
}
