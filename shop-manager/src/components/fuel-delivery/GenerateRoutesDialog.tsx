import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useShopId } from '@/hooks/useShopId';
import { useFuelDeliveryDrivers, useFuelDeliveryTrucks } from '@/hooks/useFuelDelivery';
import { 
  generateRoutesForDate, 
  generateRoutesForDateRange,
  previewRoutesForDate,
  getUpcomingDeliveryDays 
} from '@/services/fuelDelivery/AutoRouteGenerationService';

interface GenerateRoutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateRoutesDialog({ open, onOpenChange, onSuccess }: GenerateRoutesDialogProps) {
  const { shopId } = useShopId();
  const { data: drivers } = useFuelDeliveryDrivers();
  const { data: trucks } = useFuelDeliveryTrucks();
  
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedTruck, setSelectedTruck] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [upcomingDays, setUpcomingDays] = useState<any[]>([]);

  // Load preview and upcoming days when dialog opens
  useEffect(() => {
    if (open && shopId) {
      loadPreview();
      loadUpcomingDays();
    }
  }, [open, shopId, selectedDate]);

  const loadPreview = async () => {
    if (!shopId) return;
    const result = await previewRoutesForDate(shopId, new Date(selectedDate));
    setPreview(result);
  };

  const loadUpcomingDays = async () => {
    if (!shopId) return;
    const days = await getUpcomingDeliveryDays(shopId, 14);
    setUpcomingDays(days);
  };

  const handleGenerate = async () => {
    if (!shopId) {
      toast.error('Shop not found');
      return;
    }

    setIsGenerating(true);
    try {
      let result;
      
      if (mode === 'single') {
        result = await generateRoutesForDate(
          shopId,
          new Date(selectedDate),
          selectedDriver || undefined,
          selectedTruck || undefined
        );
      } else {
        result = await generateRoutesForDateRange(
          shopId,
          new Date(selectedDate),
          new Date(endDate),
          selectedDriver || undefined,
          selectedTruck || undefined
        );
      }

      if (result.routesCreated > 0) {
        toast.success(`Created ${result.routesCreated} route(s) with ${result.stopsCreated} stops`);
        onSuccess();
        onOpenChange(false);
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      } else {
        toast.info('No routes to generate');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate routes');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectUpcomingDay = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setMode('single');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Routes from Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick select upcoming delivery days */}
          {upcomingDays.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground">Quick Select</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {upcomingDays.slice(0, 5).map((day, i) => (
                  <Button
                    key={i}
                    variant={format(day.date, 'yyyy-MM-dd') === selectedDate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectUpcomingDay(day.date)}
                  >
                    {format(day.date, 'EEE d')}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {day.stopCount}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('single')}
            >
              Single Day
            </Button>
            <Button
              variant={mode === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('range')}
            >
              Date Range
            </Button>
          </div>

          {/* Date selection */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{mode === 'single' ? 'Date' : 'Start Date'}</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            {mode === 'range' && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={selectedDate}
                />
              </div>
            )}
          </div>

          {/* Driver & Truck selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign Driver (optional)</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Any driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any driver</SelectItem>
                  {drivers?.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assign Truck (optional)</Label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger>
                  <SelectValue placeholder="Any truck" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any truck</SelectItem>
                  {trucks?.map(truck => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.truck_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {mode === 'single' && preview && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Preview: {preview.routeName}</span>
                </div>
                <div className="space-y-2">
                  {preview.stops.slice(0, 5).map((stop: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                        {i + 1}
                      </Badge>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{stop.customerName}</span>
                      {stop.preferredTimeWindow && stop.preferredTimeWindow !== 'any' && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-2 w-2 mr-1" />
                          {stop.preferredTimeWindow}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {preview.stops.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      +{preview.stops.length - 5} more stops
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {mode === 'single' && !preview && (
            <Card className="border-dashed border-yellow-500/50">
              <CardContent className="p-4 flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No deliveries scheduled for this day</span>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || (mode === 'single' && !preview)}
          >
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate {mode === 'single' ? 'Route' : 'Routes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
