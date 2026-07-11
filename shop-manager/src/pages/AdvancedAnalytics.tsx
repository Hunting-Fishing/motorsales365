import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { LaborCostDashboard } from '@/components/analytics/LaborCostDashboard';
import { TimeCardManager } from '@/components/payroll/TimeCardManager';
import { PayrollManager } from '@/components/payroll/PayrollManager';
import { ComplianceMonitor } from '@/components/compliance/ComplianceMonitor';
import { ForecastingDashboard } from '@/components/forecasting/ForecastingDashboard';

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('labor');

  return (
    <>
      <Helmet>
        <title>Advanced Analytics | All Business 365</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart className="h-8 w-8" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Labor costs, payroll, compliance, and forecasting
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Labor Costs</span>
            </TabsTrigger>
            <TabsTrigger value="timecards" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time Cards</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Payroll</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="forecasting" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Forecasting</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="labor" className="space-y-4">
            <LaborCostDashboard />
          </TabsContent>

          <TabsContent value="timecards" className="space-y-4">
            <TimeCardManager />
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <PayrollManager />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <ComplianceMonitor />
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4">
            <ForecastingDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
