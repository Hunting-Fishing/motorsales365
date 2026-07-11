import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, User, Search } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { BookableService, useCreateBookingAppointment } from '@/hooks/useBookingSystem';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: BookableService[];
}

export function CreateBookingDialog({ open, onOpenChange, services }: CreateBookingDialogProps) {
  const [step, setStep] = useState<'service' | 'datetime' | 'customer' | 'confirm'>('service');
  const [selectedService, setSelectedService] = useState<BookableService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [notes, setNotes] = useState('');

  const createBooking = useCreateBookingAppointment();

  // Fetch customers for selection
  const { data: customers } = useQuery({
    queryKey: ['customers-for-booking', customerSearch],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .limit(20);
      
      if (customerSearch) {
        query = query.or(`first_name.ilike.%${customerSearch}%,last_name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  // Generate time slots
  const timeSlots = [];
  for (let hour = 6; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedCustomerId) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = addMinutes(startTime, selectedService.duration_minutes);

    await createBooking.mutateAsync({
      customer_id: selectedCustomerId,
      service_id: selectedService.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
      notes: notes || null,
      booked_via: 'staff',
    });

    // Reset and close
    setStep('service');
    setSelectedService(null);
    setSelectedDate(undefined);
    setSelectedTime('09:00');
    setSelectedCustomerId('');
    setNotes('');
    onOpenChange(false);
  };

  const renderStep = () => {
    switch (step) {
      case 'service':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a service for this booking</p>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
              {services.filter(s => s.is_active).map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep('datetime');
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-accent transition-colors",
                    selectedService?.id === service.id && "border-primary bg-accent"
                  )}
                >
                  <div 
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {service.duration_minutes} min
                      {service.price && (
                        <Badge variant="secondary">${service.price}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select date and time for {selectedService?.name}
            </p>
            <div className="flex gap-4">
              <div>
                <Label className="mb-2 block">Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border"
                />
              </div>
              <div className="flex-1">
                <Label className="mb-2 block">Time</Label>
                <div className="grid grid-cols-3 gap-1 max-h-[280px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "p-2 text-sm rounded border hover:bg-accent transition-colors",
                        selectedTime === time && "border-primary bg-accent font-medium"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('service')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('customer')}
                disabled={!selectedDate}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'customer':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select or search for a customer</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto space-y-2">
              {customers?.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-accent transition-colors",
                    selectedCustomerId === customer.id && "border-primary bg-accent"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('datetime')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('confirm')}
                disabled={!selectedCustomerId}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and confirm the booking</p>
            
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{selectedService?.duration_minutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                </span>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this booking..."
                rows={2}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('customer')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={createBooking.isPending}>
                Create Booking
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {['service', 'datetime', 'customer', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s ? "bg-primary text-primary-foreground" : 
                ['service', 'datetime', 'customer', 'confirm'].indexOf(step) > i 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
            </React.Fragment>
          ))}
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
