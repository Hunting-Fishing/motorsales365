import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { CalendarIcon, AlertCircle, Clock, XCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteStop {
  id: string;
  fuel_delivery_customers?: {
    company_name?: string;
    contact_name: string;
  };
  fuel_delivery_orders?: {
    order_number: string;
    fuel_delivery_locations?: {
      location_name: string;
      address: string;
    };
  };
}

export interface SkipData {
  reason: string;
  customReason?: string;
  action: 'retry_later' | 'reschedule' | 'cancel' | 'skip_only';
  rescheduleDate?: string;
  notes?: string;
}

interface SkipStopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: RouteStop | null;
  onSkip: (data: SkipData) => void;
  isLoading?: boolean;
}

const SKIP_REASONS = [
  { value: 'customer_not_available', label: 'Customer not available' },
  { value: 'no_access', label: 'No access to tank' },
  { value: 'weather', label: 'Weather conditions' },
  { value: 'customer_requested', label: 'Customer requested skip' },
  { value: 'wrong_address', label: 'Wrong address / Cannot locate' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'truck_issue', label: 'Truck / Equipment issue' },
  { value: 'other', label: 'Other' },
] as const;

const SKIP_ACTIONS = [
  { 
    value: 'retry_later', 
    label: 'Retry Later Today', 
    description: 'Move to end of route',
    icon: Clock 
  },
  { 
    value: 'reschedule', 
    label: 'Reschedule', 
    description: 'Deliver on another day',
    icon: CalendarIcon 
  },
  { 
    value: 'cancel', 
    label: 'Cancel Order', 
    description: 'Remove from deliveries',
    icon: XCircle 
  },
  { 
    value: 'skip_only', 
    label: 'Just Skip', 
    description: 'Mark as skipped, no action',
    icon: SkipForward 
  },
] as const;

export function SkipStopDialog({ 
  open, 
  onOpenChange, 
  stop, 
  onSkip,
  isLoading = false 
}: SkipStopDialogProps) {
  const [reason, setReason] = useState<string>('customer_not_available');
  const [customReason, setCustomReason] = useState('');
  const [action, setAction] = useState<SkipData['action']>('skip_only');
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [notes, setNotes] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = () => {
    const skipData: SkipData = {
      reason: reason === 'other' ? 'other' : reason,
      customReason: reason === 'other' ? customReason : undefined,
      action,
      rescheduleDate: action === 'reschedule' && rescheduleDate 
        ? format(rescheduleDate, 'yyyy-MM-dd') 
        : undefined,
      notes: notes.trim() || undefined,
    };
    onSkip(skipData);
  };

  const resetForm = () => {
    setReason('customer_not_available');
    setCustomReason('');
    setAction('skip_only');
    setRescheduleDate(addDays(new Date(), 1));
    setNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const stopName = stop?.fuel_delivery_customers?.company_name || 
                   stop?.fuel_delivery_customers?.contact_name ||
                   stop?.fuel_delivery_orders?.fuel_delivery_locations?.location_name ||
                   'this stop';

  const isValid = reason !== 'other' || customReason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Skip Delivery Stop
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stop Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">{stopName}</p>
            {stop?.fuel_delivery_orders?.fuel_delivery_locations?.address && (
              <p className="text-xs text-muted-foreground mt-1">
                {stop.fuel_delivery_orders.fuel_delivery_locations.address}
              </p>
            )}
          </div>

          {/* Skip Reason */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you skipping this stop?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {SKIP_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <Label 
                    htmlFor={`reason-${r.value}`} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {reason === 'other' && (
              <Input
                placeholder="Enter reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Skip Action */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What should happen next?</Label>
            <RadioGroup 
              value={action} 
              onValueChange={(v) => setAction(v as SkipData['action'])} 
              className="space-y-2"
            >
              {SKIP_ACTIONS.map((a) => (
                <div 
                  key={a.value} 
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-3 transition-colors",
                    action === a.value ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem value={a.value} id={`action-${a.value}`} className="mt-0.5" />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`action-${a.value}`} 
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <a.icon className="h-4 w-4 text-muted-foreground" />
                      {a.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reschedule Date Picker */}
          {action === 'reschedule' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reschedule to</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !rescheduleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDate ? format(rescheduleDate, "EEEE, MMMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={(date) => {
                      setRescheduleDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className={cn(
              action === 'cancel' && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isLoading ? 'Processing...' : 'Skip Stop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
