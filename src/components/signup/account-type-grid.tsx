import { Search, Tag, Building2, Wrench } from "lucide-react";
import { AccountTypeCard } from "./account-type-card";

export type SignupIntent = "buyer" | "private_seller" | "business" | "service_provider";

export const SIGNUP_TYPES: {
  id: SignupIntent;
  label: string;
  description: string;
  icon: typeof Search;
  badge?: string;
}[] = [
  {
    id: "buyer",
    label: "Buyer / Browser",
    description: "Browse listings, save favorites, and message sellers directly.",
    icon: Search,
  },
  {
    id: "private_seller",
    label: "Private seller",
    description: "Sell your own vehicle, equipment, or spare parts quickly.",
    icon: Tag,
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
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
