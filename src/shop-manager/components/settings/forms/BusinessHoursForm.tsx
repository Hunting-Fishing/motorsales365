
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import type { BusinessHours } from '@/services/settings/companyService';

interface BusinessHoursFormProps {
  businessHours: BusinessHours[];
  saving: boolean;
  dataChanged: boolean;
  onChange: (hours: BusinessHours[]) => void;
  onSave: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function BusinessHoursForm({
  businessHours,
  saving,
  dataChanged,
  onChange,
  onSave
}: BusinessHoursFormProps) {
  const handleHourChange = (dayIndex: number, field: keyof BusinessHours, value: any) => {
    const updatedHours = businessHours.map((hour, index) => {
      if (index === dayIndex) {
        return { ...hour, [field]: value };
      }
      return hour;
    });
    onChange(updatedHours);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayHours = businessHours.find(h => h.day_of_week === index) || {
            day_of_week: index,
            open_time: '09:00',
            close_time: '17:00',
            is_closed: false,
            shop_id: ''
          };

          return (
            <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-24">
                <Label className="font-medium">{day}</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={!dayHours.is_closed}
                  onCheckedChange={(checked) => 
                    handleHourChange(index, 'is_closed', !checked)
                  }
                />
                <Label className="text-sm">Open</Label>
              </div>

              {!dayHours.is_closed && (
                <>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="time"
                      value={dayHours.open_time}
                      onChange={(e) => 
                        handleHourChange(index, 'open_time', e.target.value)
                      }
                      className="w-32"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="time"
                      value={dayHours.close_time}
                      onChange={(e) => 
                        handleHourChange(index, 'close_time', e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                </>
              )}

              {dayHours.is_closed && (
                <div className="text-sm text-muted-foreground ml-4">
                  Closed
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={onSave}
          disabled={!dataChanged || saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
