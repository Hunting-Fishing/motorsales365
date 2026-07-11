import React from 'react';
import { SettingsPageHeader } from '@/components/settings/SettingsPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, Settings } from 'lucide-react';

export default function SchedulingSettings() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <SettingsPageHeader 
        title="Scheduling" 
        description="Configure appointment scheduling settings"
      />
      
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Settings
            </CardTitle>
            <CardDescription>
              Configure online booking options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up available appointment types, durations, and booking windows.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours
            </CardTitle>
            <CardDescription>
              Define available time slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure business hours and availability for appointments.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resource Allocation
            </CardTitle>
            <CardDescription>
              Manage bays and technician availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Allocate bays and technicians to appointment types.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Reminder Settings
            </CardTitle>
            <CardDescription>
              Configure appointment reminders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up email and SMS reminders for upcoming appointments.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
