import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, ShieldOff } from "lucide-react";

interface ToolWarrantyBadgeProps {
  warrantyExpiry: string | null;
}

export function ToolWarrantyBadge({ warrantyExpiry }: ToolWarrantyBadgeProps) {
  if (!warrantyExpiry) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <ShieldOff className="h-3 w-3" />
        No Warranty
      </Badge>
    );
  }

  const expiryDate = new Date(warrantyExpiry);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <ShieldX className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
        <ShieldAlert className="h-3 w-3" />
        Expiring Soon
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
      <ShieldCheck className="h-3 w-3" />
      Active
    </Badge>
  );
}

export function getWarrantyStatus(warrantyExpiry: string | null): 'active' | 'expiring' | 'expired' | 'none' {
  if (!warrantyExpiry) return 'none';
  
  const expiryDate = new Date(warrantyExpiry);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'active';
}

export function getWarrantyDaysRemaining(warrantyExpiry: string | null): number | null {
  if (!warrantyExpiry) return null;
  
  const expiryDate = new Date(warrantyExpiry);
  const today = new Date();
  return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
