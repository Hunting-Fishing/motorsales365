import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, Bell, Calendar, Phone, Mail, 
  Clock, RefreshCw, Ship, Truck 
} from "lucide-react";
import { InsurancePolicy } from "@/types/insurance";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useInsurancePolicies } from "@/hooks/useInsurancePolicies";

interface InsuranceRenewalAlertsProps {
  renewals: (InsurancePolicy & { daysUntilExpiry: number })[];
}

export function InsuranceRenewalAlerts({ renewals }: InsuranceRenewalAlertsProps) {
  const { updateStatus } = useInsurancePolicies();

  const getUrgencyColor = (days: number) => {
    if (days <= 0) return 'bg-destructive';
    if (days <= 7) return 'bg-red-500';
    if (days <= 30) return 'bg-amber-500';
    return 'bg-yellow-500';
  };

  const getUrgencyLabel = (days: number) => {
    if (days <= 0) return 'EXPIRED';
    if (days <= 7) return 'CRITICAL';
    if (days <= 30) return 'URGENT';
    return 'UPCOMING';
  };

  const getAssetInfo = (policy: InsurancePolicy) => {
    if (policy.equipment) {
      return { icon: Ship, name: policy.equipment.name };
    }
    if (policy.vehicle) {
      return { icon: Truck, name: `${policy.vehicle.year} ${policy.vehicle.make} ${policy.vehicle.model}` };
    }
    return { icon: Bell, name: 'General Policy' };
  };

  if (renewals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 rounded-full bg-green-500/10 mb-4">
            <Bell className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Upcoming Renewals</h3>
          <p className="text-muted-foreground text-center max-w-md">
            All your insurance policies are up to date. No renewals needed in the next 90 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">
                  {renewals.filter(r => r.daysUntilExpiry <= 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Clock className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Within 7 Days</p>
                <p className="text-2xl font-bold">
                  {renewals.filter(r => r.daysUntilExpiry > 0 && r.daysUntilExpiry <= 7).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Within 30 Days</p>
                <p className="text-2xl font-bold">
                  {renewals.filter(r => r.daysUntilExpiry > 7 && r.daysUntilExpiry <= 30).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Bell className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Within 90 Days</p>
                <p className="text-2xl font-bold">
                  {renewals.filter(r => r.daysUntilExpiry > 30).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Policies Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renewals.map((policy) => {
              const asset = getAssetInfo(policy);
              const AssetIcon = asset.icon;

              return (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getUrgencyColor(policy.daysUntilExpiry)}/10`}>
                      <AssetIcon className={`h-5 w-5 ${getUrgencyColor(policy.daysUntilExpiry).replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{asset.name}</span>
                        <Badge className={getUrgencyColor(policy.daysUntilExpiry)}>
                          {getUrgencyLabel(policy.daysUntilExpiry)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {policy.insurance_provider} • {policy.policy_number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires: {format(parseISO(policy.expiration_date), 'MMM d, yyyy')}
                        {policy.daysUntilExpiry > 0 ? ` (${policy.daysUntilExpiry} days)` : ' (EXPIRED)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(policy.premium_amount)}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {policy.payment_frequency}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {policy.agent_phone && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`tel:${policy.agent_phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {policy.agent_email && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`mailto:${policy.agent_email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => updateStatus.mutate({ id: policy.id, status: 'pending_renewal' })}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Renew
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
