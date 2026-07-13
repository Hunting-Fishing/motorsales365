import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useMaintenanceTrends } from '@/hooks/useMaintenanceTrends';
import { ComplianceChart } from './ComplianceChart';
import { EmployeePerformanceCard } from './EmployeePerformanceCard';
import { BreakdownTracker } from './BreakdownTracker';
import { format, subDays } from 'date-fns';

const dateRangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' }
];

export function MaintenanceTrendsTab() {
  const [dateRangeValue, setDateRangeValue] = useState('30');
  
  const dateRange = {
    from: format(subDays(new Date(), parseInt(dateRangeValue)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  };

  const { 
    compliance, 
    isLoadingCompliance,
    employees,
    isLoadingEmployees,
    breakdowns,
    isLoadingBreakdowns,
    trendData,
    refetchAll 
  } = useMaintenanceTrends(dateRange);

  // Calculate compliance rate
  const complianceRate = compliance && compliance.total > 0
    ? Math.round(((compliance.early + compliance.onTime) / compliance.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Maintenance Trends & Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Track compliance, breakdowns, and employee performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRangeValue} onValueChange={setDateRangeValue}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{complianceRate}%</p>
                <p className="text-xs text-muted-foreground">Compliance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.late || 0}</p>
                <p className="text-xs text-muted-foreground">Late Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{breakdowns?.totalBreakdowns || 0}</p>
                <p className="text-xs text-muted-foreground">Breakdowns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceChart 
          compliance={compliance} 
          trendData={trendData}
          isLoading={isLoadingCompliance} 
        />
        
        <BreakdownTracker 
          breakdowns={breakdowns}
          isLoading={isLoadingBreakdowns}
        />
      </div>

      {/* Employee Performance */}
      <EmployeePerformanceCard 
        employees={employees}
        isLoading={isLoadingEmployees}
      />

      {/* Breakdown Cost Summary */}
      {breakdowns && breakdowns.totalBreakdowns > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Breakdown Impact Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  ${breakdowns.totalRepairCost.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Repair Cost</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {breakdowns.totalDowntimeHours.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">Total Downtime</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {breakdowns.preventableCount}
                </p>
                <p className="text-xs text-muted-foreground">Preventable</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">
                  {breakdowns.totalBreakdowns > 0 
                    ? Math.round((breakdowns.preventableCount / breakdowns.totalBreakdowns) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Preventable Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
