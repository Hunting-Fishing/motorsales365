
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BusinessHoursBookingDialog } from '@/components/booking/BusinessHoursBookingDialog';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function CustomerAppointmentBooking() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const { events, isLoading } = useCalendarEvents(currentDate, 'month');
  const { businessHours, isBusinessDay } = useBusinessHours();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowBookingDialog(true);
  };

  const handleBooking = (date: Date, time: string) => {
    // Here you would typically make an API call to create the appointment
    toast.success(
      `Appointment request submitted for ${format(date, 'MMMM d, yyyy')} at ${time}`,
      {
        description: "We'll contact you shortly to confirm your appointment."
      }
    );
    setShowBookingDialog(false);
    setSelectedDate(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book an Appointment
          </CardTitle>
          <CardDescription>
            Select a date and time that works best for you. Available slots are shown based on our business hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <CalendarView
                events={events}
                currentDate={currentDate}
                view="month"
                loading={isLoading}
                onDateClick={handleDateClick}
                isCustomerView={true}
                businessHours={businessHours}
                isBusinessDay={isBusinessDay}
              />
            </div>
            
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    How it works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-blue-600">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Select Date</div>
                      <div className="text-sm text-gray-600">Click on any available date in the calendar</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-blue-600">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Choose Time</div>
                      <div className="text-sm text-gray-600">Pick from available time slots</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Confirmation</div>
                      <div className="text-sm text-gray-600">We'll contact you to confirm details</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Available for booking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Closed / Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-sm">Past dates</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <BusinessHoursBookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        onBook={handleBooking}
      />
    </div>
  );
}
