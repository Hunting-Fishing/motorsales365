import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Plus, AlertTriangle, FileText, TrendingUp, 
  DollarSign, Calendar, Bell, Loader2, AlertCircle 
} from "lucide-react";
import { useInsurancePolicies } from "@/hooks/useInsurancePolicies";
import { useInsuranceAnalytics } from "@/hooks/useInsuranceAnalytics";
import { InsurancePolicyList } from "./InsurancePolicyList";
import { AddInsurancePolicyDialog } from "./AddInsurancePolicyDialog";
import { InsuranceRenewalAlerts } from "./InsuranceRenewalAlerts";
import { InsuranceTrendsCard } from "./InsuranceTrendsCard";
import { InsuranceBudgetTracker } from "./InsuranceBudgetTracker";
import { formatCurrency } from "@/lib/utils";

export function InsuranceDashboard() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { policies, stats, upcomingRenewals, isLoading, error } = useInsurancePolicies();
  const analytics = useInsuranceAnalytics(policies);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load insurance policies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Insurance Management</h2>
          <p className="text-muted-foreground">
            Track policies, renewals, and insurance costs for all assets
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{stats.activePolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring (30d)</p>
                <p className="text-2xl font-bold">{stats.expiringIn30Days}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Premiums</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.annualPremiumTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Coverage</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCoverage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            All Policies
          </TabsTrigger>
          <TabsTrigger value="renewals" className="gap-2">
            <Bell className="h-4 w-4" />
            Renewals
            {stats.expiringIn30Days > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {stats.expiringIn30Days}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Budget
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <InsurancePolicyList policies={policies} />
        </TabsContent>

        <TabsContent value="renewals">
          <InsuranceRenewalAlerts renewals={upcomingRenewals} />
        </TabsContent>

        <TabsContent value="trends">
          <InsuranceTrendsCard 
            premiumTrends={analytics.premiumTrends}
            insuranceByType={analytics.insuranceByType}
            insuranceByProvider={analytics.insuranceByProvider}
          />
        </TabsContent>

        <TabsContent value="budget">
          <InsuranceBudgetTracker 
            annualPremiumTotal={analytics.annualPremiumTotal}
            premiumForecast={analytics.premiumForecast}
          />
        </TabsContent>
      </Tabs>

      {/* Add Policy Dialog */}
      <AddInsurancePolicyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
