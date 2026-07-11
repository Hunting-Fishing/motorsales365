import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  BarChart3, 
  Settings, 
  Calendar,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { WorkOrderOverviewStats } from './enhanced-work-orders/WorkOrderOverviewStats';
import { WorkOrderAnalytics } from './enhanced-work-orders/WorkOrderAnalytics';
import { WorkOrderManagement } from './enhanced-work-orders/WorkOrderManagement';
import { WorkOrderTimeline } from './enhanced-work-orders/WorkOrderTimeline';
import { WorkOrderQuickActions } from './enhanced-work-orders/WorkOrderQuickActions';
import { WorkOrderAdvancedFilters } from './enhanced-work-orders/WorkOrderAdvancedFilters';
import { DailyWorkOrdersDashboard } from './enhanced-work-orders/DailyWorkOrdersDashboard';

export function EnhancedWorkOrdersDashboard() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Work Orders Management</h1>
          <p className="text-muted-foreground">Comprehensive work order analytics and management</p>
        </div>
      </div>

      {/* Overview Stats */}
      <WorkOrderOverviewStats />

      {/* Main Dashboard Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Management
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <WorkOrderAnalytics />
              <WorkOrderAdvancedFilters />
            </div>
            <div className="space-y-6">
              <WorkOrderQuickActions />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                      <p className="text-sm font-medium text-orange-800">5 Overdue Work Orders</p>
                      <p className="text-xs text-orange-600">Require immediate attention</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                      <p className="text-sm font-medium text-red-800">3 High Priority Orders</p>
                      <p className="text-xs text-red-600">Due within 24 hours</p>
                    </div>
                    <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                      <p className="text-sm font-medium text-yellow-800">12 Pending Assignments</p>
                      <p className="text-xs text-yellow-600">Awaiting technician assignment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <DailyWorkOrdersDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <WorkOrderAnalytics />
        </TabsContent>

        <TabsContent value="management">
          <WorkOrderManagement />
        </TabsContent>

        <TabsContent value="timeline">
          <WorkOrderTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}