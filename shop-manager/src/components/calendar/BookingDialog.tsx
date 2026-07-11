
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getAvailableTimeSlots, createBookingRequest, TimeSlot } from "@/services/calendar/bookingService";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader } from "lucide-react";

interface BookingDialogProps {
  date: Date;
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
}

export function BookingDialog({ date, isOpen, onClose, customerId }: BookingDialogProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Load available time slots when dialog opens
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        const formattedDate = format(date, "yyyy-MM-dd");
        const slots = await getAvailableTimeSlots(formattedDate);
        setTimeSlots(slots);
        setSelectedTimeSlot(null); // Reset selection
      } catch (err) {
        console.error("Error loading time slots:", err);
        toast("Error loading time slots");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchTimeSlots();
    }
  }, [date, isOpen]);
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTimeSlot(null);
      setServiceType("");
      setNotes("");
    }
  }, [isOpen]);
  
  // Handle booking submission
  const handleSubmit = async () => {
    if (!selectedTimeSlot || !serviceType || !customerId) {
      toast("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      
      const bookingData = {
        customer_id: customerId,
        technician_id: selectedTimeSlot.technician_id || "",
        date: formattedDate,
        time_slot: selectedTimeSlot.time,
        service_type: serviceType,
        notes: notes
      };
      
      const success = await createBookingRequest(bookingData);
      
      if (success) {
        toast("Booking Request Submitted", {
          description: "Your appointment request is pending approval"
        });
        onClose();
      } else {
        toast("Booking Failed", {
          description: "There was an error submitting your appointment request"
        });
      }
    } catch (err) {
      console.error("Error submitting booking:", err);
      toast("Booking Error", {
        description: "There was a problem processing your request"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
          <DialogDescription>
            {date ? format(date, "EEEE, MMMM d, yyyy") : "Select a time slot"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Time Slot Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Time Slots</label>
            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No available time slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedTimeSlot?.id === slot.id ? "default" : "outline"}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className="w-full"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {/* Service Type */}
          <div className="space-y-2">
            <label htmlFor="serviceType" className="text-sm font-medium">
              Service Type
            </label>
            <Select
              value={serviceType}
              onValueChange={setServiceType}
            >
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oil_change">Oil Change</SelectItem>
                <SelectItem value="tune_up">Tune Up</SelectItem>
                <SelectItem value="brake_service">Brake Service</SelectItem>
                <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                <SelectItem value="inspection">Vehicle Inspection</SelectItem>
                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                <SelectItem value="other">Other Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </label>
            <Textarea
              id="notes"
              placeholder="Please provide any details about your appointment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedTimeSlot || !serviceType || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Appointment"
            )}
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mt-2">
          Your appointment will be pending until approved by our staff
        </p>
      </DialogContent>
    </Dialog>
  );
}
