
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useCompany } from '@/contexts/CompanyContext';
import { format, addDays, startOfDay } from 'date-fns';

interface BusinessHoursBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (date: Date, time: string) => void;
}

export const BusinessHoursBookingDialog: React.FC<BusinessHoursBookingDialogProps> = ({
  open,
  onOpenChange,
  onBook
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const { getAvailableTimeSlots, isBusinessDay } = useBusinessHours();
  const { companyName } = useCompany();

  const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined); // Reset time when date changes
  };

  const handleBook = () => {
    if (selectedDate && selectedTime) {
      onBook(selectedDate, selectedTime);
      onOpenChange(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    if (date < startOfDay(new Date())) return true;
    
    // Disable dates that are not business days
    if (!isBusinessDay(date.getDay())) return true;
    
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment with {companyName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Select Date</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              className="rounded-md border"
            />
          </div>

          {selectedDate && availableSlots.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Select Time</h4>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedDate && availableSlots.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 border rounded-md">
              No available time slots for {format(selectedDate, 'MMMM d, yyyy')}. 
              Please select a different date.
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
