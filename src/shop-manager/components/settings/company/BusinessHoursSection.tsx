
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BusinessHours } from "@/services/settings/companyService";

interface BusinessHoursSectionProps {
  businessHours: BusinessHours[];
  onBusinessHoursChange: (hours: BusinessHours[]) => void;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday", 
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export function BusinessHoursSection({
  businessHours,
  onBusinessHoursChange
}: BusinessHoursSectionProps) {
  
  const handleDayToggle = (dayIndex: number, isClosed: boolean) => {
    const updatedHours = businessHours.map(hour => 
      hour.day_of_week === dayIndex 
        ? { ...hour, is_closed: isClosed }
        : hour
    );
    onBusinessHoursChange(updatedHours);
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    const updatedHours = businessHours.map(hour => 
      hour.day_of_week === dayIndex 
        ? { ...hour, [field]: value }
        : hour
    );
    onBusinessHoursChange(updatedHours);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayHours = businessHours.find(h => h.day_of_week === index) || {
            day_of_week: index,
            open_time: "09:00:00",
            close_time: "17:00:00", 
            is_closed: index === 0 || index === 6,
            shop_id: ""
          };

          return (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Label className="w-20 font-medium">{day}</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={!dayHours.is_closed}
                        onCheckedChange={(checked) => handleDayToggle(index, !checked)}
                      />
                      <Label className="text-sm text-gray-600">
                        {dayHours.is_closed ? "Closed" : "Open"}
                      </Label>
                    </div>
                  </div>
                  
                  {!dayHours.is_closed && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={dayHours.open_time?.substring(0, 5) || "09:00"}
                        onChange={(e) => handleTimeChange(index, 'open_time', e.target.value + ":00")}
                        className="w-24"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={dayHours.close_time?.substring(0, 5) || "17:00"}
                        onChange={(e) => handleTimeChange(index, 'close_time', e.target.value + ":00")}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
