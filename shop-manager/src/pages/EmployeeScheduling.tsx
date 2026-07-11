import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, FileText, Settings, UserCog, Package, CalendarDays, Bell } from 'lucide-react';
import { StaffSchedulingCalendar } from '@/components/scheduling/StaffSchedulingCalendar';
import { ScheduleCalendar } from '@/components/scheduling/ScheduleCalendar';
import { TimeOffRequests } from '@/components/scheduling/TimeOffRequests';
import { PTOManagement } from '@/components/scheduling/PTOManagement';
import { AccommodationsManagement } from '@/components/scheduling/AccommodationsManagement';
import { SchedulingSettings } from '@/components/scheduling/SchedulingSettings';
import { AssetAssignments } from '@/components/scheduling/AssetAssignments';
import { EmployeeAvailabilityManager } from '@/components/scheduling/EmployeeAvailabilityManager';
import { ShiftSwapManager } from '@/components/scheduling/ShiftSwapManager';
import { ScheduleNotifications } from '@/components/scheduling/ScheduleNotifications';

export default function EmployeeScheduling() {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <>
      <Helmet>
        <title>Staff Scheduling | All Business 365</title>
        <meta name="description" content="Manage employee schedules, vessel and equipment assignments, time-off requests, and PTO" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            Staff Scheduling
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage work schedules, asset assignments, time-off requests, and accommodations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="week-view" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Week View</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Availability</span>
            </TabsTrigger>
            <TabsTrigger value="swaps" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Swaps</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="time-off" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time Off</span>
            </TabsTrigger>
            <TabsTrigger value="pto" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PTO</span>
            </TabsTrigger>
            <TabsTrigger value="accommodations" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Accommodations</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <StaffSchedulingCalendar />
          </TabsContent>

          <TabsContent value="week-view" className="space-y-4">
            <ScheduleCalendar />
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <EmployeeAvailabilityManager />
          </TabsContent>

          <TabsContent value="swaps" className="space-y-4">
            <ShiftSwapManager />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <ScheduleNotifications />
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <AssetAssignments />
          </TabsContent>

          <TabsContent value="time-off" className="space-y-4">
            <TimeOffRequests />
          </TabsContent>

          <TabsContent value="pto" className="space-y-4">
            <PTOManagement />
          </TabsContent>

          <TabsContent value="accommodations" className="space-y-4">
            <AccommodationsManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SchedulingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
