import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sm/components/ui/tabs';
import { PayrollDashboard } from '@sm/components/payroll/PayrollDashboard';
import { EmployeeTimeClock } from '@sm/components/payroll/EmployeeTimeClock';
import { EnhancedTimeCardManager } from '@sm/components/payroll/EnhancedTimeCardManager';
import { PayPeriodManager } from '@sm/components/payroll/PayPeriodManager';
import { PayrollReportsPanel } from '@sm/components/payroll/PayrollReportsPanel';
import { EmployeeRatesPanel } from '@sm/components/payroll/EmployeeRatesPanel';
import { OvertimeAlertsPanel } from '@sm/components/payroll/OvertimeAlertsPanel';
import { OvertimeConfigPanel } from '@sm/components/payroll/OvertimeConfigPanel';
import { PayrollRunPanel } from '@sm/components/payroll/PayrollRunPanel';
import { LeaveManagementPanel } from '@sm/components/payroll/LeaveManagementPanel';
import { DeductionsAdditionsPanel } from '@sm/components/payroll/DeductionsAdditionsPanel';
import { TimeCardDisputesPanel } from '@sm/components/payroll/TimeCardDisputesPanel';
import { PayrollAuditTrail } from '@sm/components/payroll/PayrollAuditTrail';
import { PayrollHistoryPanel } from '@sm/components/payroll/PayrollHistoryPanel';
import { 
  LayoutDashboard, 
  Clock, 
  CreditCard, 
  Calendar, 
  FileText, 
  DollarSign,
  AlertTriangle,
  Settings,
  Play,
  Palmtree,
  PlusCircle,
  MessageSquare,
  History,
  Archive
} from 'lucide-react';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Payroll & Time Tracking</h1>
        <p className="text-muted-foreground">
          Manage employee time cards, pay periods, and payroll reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 h-auto p-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="timeclock" className="flex items-center gap-2 py-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Time Clock</span>
          </TabsTrigger>
          <TabsTrigger value="timecards" className="flex items-center gap-2 py-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Time Cards</span>
          </TabsTrigger>
          <TabsTrigger value="overtime" className="flex items-center gap-2 py-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Overtime</span>
          </TabsTrigger>
          <TabsTrigger value="runpayroll" className="flex items-center gap-2 py-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run Payroll</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2 py-2">
            <Palmtree className="h-4 w-4" />
            <span className="hidden sm:inline">PTO/Leave</span>
          </TabsTrigger>
          <TabsTrigger value="payperiods" className="flex items-center gap-2 py-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Pay Periods</span>
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2 py-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Rates</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="deductions" className="flex items-center gap-2 py-2">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Deductions</span>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-2 py-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Disputes</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 py-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2 py-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 py-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PayrollDashboard />
        </TabsContent>

        <TabsContent value="timeclock" className="space-y-6">
          <EmployeeTimeClock />
        </TabsContent>

        <TabsContent value="timecards" className="space-y-6">
          <EnhancedTimeCardManager />
        </TabsContent>

        <TabsContent value="overtime" className="space-y-6">
          <OvertimeAlertsPanel />
        </TabsContent>

        <TabsContent value="runpayroll" className="space-y-6">
          <PayrollRunPanel />
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <LeaveManagementPanel />
        </TabsContent>

        <TabsContent value="payperiods" className="space-y-6">
          <PayPeriodManager />
        </TabsContent>

        <TabsContent value="rates" className="space-y-6">
          <EmployeeRatesPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <PayrollReportsPanel />
        </TabsContent>

        <TabsContent value="deductions" className="space-y-6">
          <DeductionsAdditionsPanel />
        </TabsContent>

        <TabsContent value="disputes" className="space-y-6">
          <TimeCardDisputesPanel />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <PayrollHistoryPanel />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <PayrollAuditTrail />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <OvertimeConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
