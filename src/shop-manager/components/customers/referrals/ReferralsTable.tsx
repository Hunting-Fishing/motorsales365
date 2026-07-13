
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { CustomerReferralView } from "@/types/referral";
import { formatDate } from "@/utils/dateUtils";

interface ReferralsTableProps {
  referrals: CustomerReferralView[];
  loading: boolean;
}

export const ReferralsTable: React.FC<ReferralsTableProps> = ({ referrals, loading }) => {
  const renderStatusBadge = (status: string) => {
    let badgeVariant: "outline" | "default" | "secondary" | "destructive" | null = "default";
    
    switch (status) {
      case 'pending':
        badgeVariant = "outline";
        break;
      case 'converted':
        badgeVariant = "secondary";
        break;
      case 'cancelled':
        badgeVariant = "destructive";
        break;
      default:
        badgeVariant = "outline";
    }
    
    return (
      <Badge variant={badgeVariant} className="capitalize">
        {status}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  
  if (referrals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No referrals found. Start referring customers to earn rewards!
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Referred Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Converted</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referrals.map((referral) => (
            <TableRow key={referral.id}>
              <TableCell>{formatDate(referral.referral_date)}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">
                    {referral.referred_first_name} {referral.referred_last_name}
                  </span>
                  <p className="text-xs text-muted-foreground">{referral.referred_email}</p>
                </div>
              </TableCell>
              <TableCell>{renderStatusBadge(referral.status)}</TableCell>
              <TableCell>
                {referral.converted_at ? formatDate(referral.converted_at) : 'N/A'}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {referral.notes || '-'}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
