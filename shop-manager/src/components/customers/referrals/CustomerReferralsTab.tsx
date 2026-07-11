
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, RefreshCcw, Users, UserPlus } from "lucide-react";
import { Customer } from "@/types/customer";
import { CustomerReferralView } from "@/types/referral";
import { getReferralsByReferrer } from "@/services/referral/referralService";
import { ReferralsTable } from "./ReferralsTable";
import { ReferralStats } from "./ReferralStats";
import { AddReferralDialog } from "./AddReferralDialog";

interface CustomerReferralsTabProps {
  customer: Customer;
}

export const CustomerReferralsTab: React.FC<CustomerReferralsTabProps> = ({ customer }) => {
  const [referrals, setReferrals] = useState<CustomerReferralView[]>([]);
  const [loading, setLoading] = useState(false);
  const [addReferralOpen, setAddReferralOpen] = useState(false);

  const fetchReferrals = async () => {
    if (!customer.id) return;

    try {
      setLoading(true);
      const data = await getReferralsByReferrer(customer.id);
      setReferrals(data);
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [customer.id]);

  const handleReferralAdded = (newReferral: CustomerReferralView) => {
    setReferrals(prev => [newReferral, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Customer Referrals</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReferrals} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setAddReferralOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Referral
          </Button>
        </div>
      </div>

      <ReferralStats customer={customer} referrals={referrals} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Referral History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralsTable referrals={referrals} loading={loading} />
        </CardContent>
      </Card>

      <AddReferralDialog
        open={addReferralOpen}
        onOpenChange={setAddReferralOpen}
        customer={customer}
        onReferralAdded={handleReferralAdded}
      />
    </div>
  );
};
