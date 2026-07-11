import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Settings, List, Plus, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { useBookingAppointments, useBookingWaitlist, useBookableServices, useBookingSettings } from '@/hooks/useBookingSystem';
import { BookingCalendarView } from '@/components/booking/BookingCalendarView';
import { BookingServiceMenu } from '@/components/booking/BookingServiceMenu';
import { BookingWaitlistView } from '@/components/booking/BookingWaitlistView';
import { BookingSettingsPanel } from '@/components/booking/BookingSettingsPanel';
import { CreateBookingDialog } from '@/components/booking/CreateBookingDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingManagement() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(addDays(new Date(), 30)),
  });

  const { data: appointments, isLoading: appointmentsLoading } = useBookingAppointments(dateRange);
  const { data: waitlist, isLoading: waitlistLoading } = useBookingWaitlist();
  const { data: services, isLoading: servicesLoading } = useBookableServices();
  const { data: settings } = useBookingSettings();

  const pendingCount = appointments?.filter(a => a.status === 'pending').length || 0;
  const todayCount = appointments?.filter(a => 
    format(new Date(a.start_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length || 0;
  const waitlistCount = waitlist?.length || 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage appointments, services, and availability
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{pendingCount}</div>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Action needed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitlistCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services?.filter(s => s.is_active).length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Waitlist</span>
            {waitlistCount > 0 && (
              <Badge variant="secondary" className="ml-1">{waitlistCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {appointmentsLoading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <BookingCalendarView 
              appointments={appointments || []} 
              services={services || []}
            />
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {servicesLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <BookingServiceMenu services={services || []} />
          )}
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          {waitlistLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <BookingWaitlistView waitlist={waitlist || []} services={services || []} />
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <BookingSettingsPanel settings={settings} />
        </TabsContent>
      </Tabs>

      <CreateBookingDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        services={services || []}
      />
    </div>
  );
}
