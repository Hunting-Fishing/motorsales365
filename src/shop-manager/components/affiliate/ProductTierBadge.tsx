
import { Badge } from "@/components/ui/badge";
import { ProductTier } from "@/types/affiliate";

interface ProductTierBadgeProps {
  tier: ProductTier;
}

const ProductTierBadge = ({ tier }: ProductTierBadgeProps) => {
  const tierConfig = {
    premium: {
      label: "Premium",
      className: "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
    },
    midgrade: {
      label: "Mid-Grade",
      className: "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
    },
    economy: {
      label: "Economy",
      className: "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
    }
  };

  const { label, className } = tierConfig[tier];

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
};

export default ProductTierBadge;
