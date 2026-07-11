import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurrencePattern } from '@/types/assetAssignment';

interface RecurrenceFieldsProps {
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  recurrenceDaysOfWeek: number[];
  onIsRecurringChange: (value: boolean) => void;
  onPatternChange: (value: RecurrencePattern) => void;
  onIntervalChange: (value: number) => void;
  onEndDateChange: (value: string) => void;
  onDaysOfWeekChange: (days: number[]) => void;
}

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function RecurrenceFields({
  isRecurring,
  recurrencePattern,
  recurrenceInterval,
  recurrenceEndDate,
  recurrenceDaysOfWeek,
  onIsRecurringChange,
  onPatternChange,
  onIntervalChange,
  onEndDateChange,
  onDaysOfWeekChange,
}: RecurrenceFieldsProps) {
  const handleDayToggle = (day: number) => {
    const newDays = recurrenceDaysOfWeek.includes(day)
      ? recurrenceDaysOfWeek.filter(d => d !== day)
      : [...recurrenceDaysOfWeek, day].sort();
    onDaysOfWeekChange(newDays);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => onIsRecurringChange(checked === true)}
        />
        <Label htmlFor="is_recurring" className="cursor-pointer font-medium">
          Make this a recurring assignment
        </Label>
      </div>

      {isRecurring && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence_pattern">Repeats</Label>
              <Select
                value={recurrencePattern}
                onValueChange={(value: RecurrencePattern) => onPatternChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence_interval">Every</Label>
              <Input
                id="recurrence_interval"
                type="number"
                min="1"
                value={recurrenceInterval}
                onChange={(e) => onIntervalChange(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {(recurrencePattern === 'weekly' || recurrencePattern === 'biweekly') && (
            <div className="space-y-2">
              <Label>Repeat on</Label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors ${
                      recurrenceDaysOfWeek.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => handleDayToggle(day.value)}
                  >
                    <span className="text-xs font-medium">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recurrence_end_date">End Date (Optional)</Label>
            <Input
              id="recurrence_end_date"
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to continue indefinitely
            </p>
          </div>
        </>
      )}
    </div>
  );
}
