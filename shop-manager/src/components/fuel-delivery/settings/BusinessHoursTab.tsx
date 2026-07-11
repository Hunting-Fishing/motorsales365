import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, Save, Loader2, Copy } from 'lucide-react';
import { useFuelDeliveryHours, FuelDeliveryHour } from '@/hooks/fuel-delivery/useFuelDeliveryHours';

interface BusinessHoursTabProps {
  shopId: string | null;
}

export function BusinessHoursTab({ shopId }: BusinessHoursTabProps) {
  const { hours, isLoading, isSaving, saveHours, dayNames } = useFuelDeliveryHours(shopId);
  const [localHours, setLocalHours] = useState<FuelDeliveryHour[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Only sync from server once when data loads, or when shopId changes
  useEffect(() => {
    if (hours.length > 0 && !initialized) {
      setLocalHours(hours);
      setInitialized(true);
    }
  }, [hours, initialized]);

  // Reset initialization when shopId changes
  useEffect(() => {
    setInitialized(false);
  }, [shopId]);

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setLocalHours(prev => prev.map(h => 
      h.day_of_week === dayIndex ? { ...h, [field]: value + ':00' } : h
    ));
  };

  const handleClosedChange = (dayIndex: number, isClosed: boolean) => {
    setLocalHours(prev => prev.map(h => 
      h.day_of_week === dayIndex ? { ...h, is_closed: isClosed } : h
    ));
  };

  const handleCopyToWeekdays = () => {
    const monday = localHours.find(h => h.day_of_week === 1);
    if (!monday) return;

    setLocalHours(prev => prev.map(h => {
      // Apply Monday's hours to Tue-Fri (days 2-5)
      if (h.day_of_week >= 2 && h.day_of_week <= 5) {
        return { ...h, open_time: monday.open_time, close_time: monday.close_time, is_closed: monday.is_closed };
      }
      return h;
    }));
  };

  const handleSave = () => {
    saveHours(localHours);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <CardTitle>Hours of Operation</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyToWeekdays}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Monday to Tue-Fri
          </Button>
        </div>
        <CardDescription>
          Set when your fuel delivery service is available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {localHours.map((hour) => (
            <div 
              key={hour.day_of_week} 
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                hour.is_closed ? 'bg-muted/50' : 'bg-background'
              }`}
            >
              <div className="w-24 font-medium">{dayNames[hour.day_of_week]}</div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Closed</span>
                <Switch 
                  checked={hour.is_closed} 
                  onCheckedChange={(checked) => handleClosedChange(hour.day_of_week, checked)}
                />
              </div>
              
              {!hour.is_closed && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hour.open_time.slice(0, 5)}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'open_time', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hour.close_time.slice(0, 5)}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'close_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </>
              )}
              
              {hour.is_closed && (
                <span className="text-sm text-muted-foreground italic">Closed for deliveries</span>
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-orange-500 hover:bg-orange-600"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Hours
        </Button>
      </CardContent>
    </Card>
  );
}
