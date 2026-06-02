import { Building2, UserRound, Wrench, type LucideIcon } from "lucide-react";

export type SignupIntent = "buyer" | "business" | "service_provider";

export const SIGNUP_TYPES: {
  id: SignupIntent;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  note?: string;
}[] = [
  {
    id: "buyer",
    label: "Buyer & Private Seller",
    description:
      "Browse listings, save favorites, message sellers — and list your own vehicle, equipment, or parts when you're ready.",
    icon: UserRound,
    note: "This personal account lets you do both: shop the marketplace and post private listings from your dashboard. Pick a business account below if you sell professionally.",
  },
  {
    id: "business",
    label: "Business / Dealer",
    description: "Dealership or vehicle rental — sell or rent out cars, trucks, and equipment.",
    icon: Building2,
    badge: "Popular for Pros",
    note: "For businesses that list vehicles for sale or rent. You'll get a professional directory profile, verified badge eligibility, and bulk listing tools. Complete your business profile right after signup.",
  },
  {
    id: "service_provider",
    label: "Service provider",
    description: "Parts shop, repair, towing, body shop, carwash, or salvage specialist.",
    icon: Wrench,
    note: "For shops and specialists that serve drivers — parts, repairs, roadside, detailing, salvage. You'll be listed in our services directory. Complete your service profile after signup to start receiving requests.",
  },
];
