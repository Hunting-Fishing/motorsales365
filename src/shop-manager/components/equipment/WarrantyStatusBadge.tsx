
import { Badge } from "@/components/ui/badge";

interface WarrantyStatusBadgeProps {
  status: string | null;
}

export function WarrantyStatusBadge({ status }: WarrantyStatusBadgeProps) {
  if (!status) {
    return <Badge variant="secondary">Unknown</Badge>;
  }

  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "not-applicable":
      return <Badge variant="secondary">Not Applicable</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
