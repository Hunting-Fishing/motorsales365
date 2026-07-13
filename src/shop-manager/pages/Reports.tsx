import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sm/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sm/components/ui/card';
import { SummaryTabContent } from '@sm/components/reports/tabs/SummaryTabContent';
import { FinancialsTabContent } from '@sm/components/reports/tabs/FinancialsTabContent';
import { PerformanceTabContent } from '@sm/components/reports/tabs/PerformanceTabContent';
import { InventoryTabContent } from '@sm/components/reports/tabs/InventoryTabContent';
import { CustomTabContent } from '@sm/components/reports/tabs/CustomTabContent';
import { CustomerReportTab } from '@sm/components/reports/CustomerReportTab';
import { BudgetDashboard } from '@sm/components/reports/budget/BudgetDashboard';
import { PeriodEndReport } from '@sm/components/reports/period-end/PeriodEndReport';
import { useReportData } from '@sm/hooks/useReportData';
import { Skeleton } from '@sm/components/ui/skeleton';
import type { ReportConfig } from '@sm/types/reports';

export default function Reports() {
  const [customReportConfig, setCustomReportConfig] = useState<ReportConfig | null>(null);
  const { reportData, loading, error } = useReportData();

  const handleGenerateReport = (config: ReportConfig) => {
    setCustomReportConfig(config);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Reports</CardTitle>
            <CardDescription>
              Unable to load report data. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive business intelligence and performance insights
        </p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="period">Period Reports</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <SummaryTabContent 
              showComparison={true}
              comparisonRevenueData={[]}
              comparisonServiceData={[]}
              salesData={[]}
              workOrderStatusData={[]}
              topSellingItems={[]}
            />
          )}
        </TabsContent>

        <TabsContent value="financials" className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {Array(2).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <FinancialsTabContent salesData={[]} />
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <BudgetDashboard />
        </TabsContent>

        <TabsContent value="period" className="space-y-6">
          <PeriodEndReport />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {Array(2).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <PerformanceTabContent servicePerformance={[]} />
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {Array(2).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <InventoryTabContent />
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerReportTab reportData={{}} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomTabContent 
            customReportConfig={customReportConfig}
            onGenerateReport={handleGenerateReport}
            isLoading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}