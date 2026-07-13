import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addQuarters, subQuarters, addYears, subYears } from 'date-fns';

interface PeriodSelectorProps {
  periodType: 'month' | 'quarter' | 'year';
  selectedDate: Date;
  onPeriodTypeChange: (type: 'month' | 'quarter' | 'year') => void;
  onDateChange: (date: Date) => void;
}

export function PeriodSelector({ 
  periodType, 
  selectedDate, 
  onPeriodTypeChange, 
  onDateChange 
}: PeriodSelectorProps) {
  const handlePrevious = () => {
    switch (periodType) {
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
      case 'quarter':
        onDateChange(subQuarters(selectedDate, 1));
        break;
      case 'year':
        onDateChange(subYears(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (periodType) {
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
      case 'quarter':
        onDateChange(addQuarters(selectedDate, 1));
        break;
      case 'year':
        onDateChange(addYears(selectedDate, 1));
        break;
    }
  };

  const getDisplayLabel = () => {
    switch (periodType) {
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'quarter':
        const quarter = Math.ceil((selectedDate.getMonth() + 1) / 3);
        return `Q${quarter} ${selectedDate.getFullYear()}`;
      case 'year':
        return selectedDate.getFullYear().toString();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as 'month' | 'quarter' | 'year')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Month-End</SelectItem>
          <SelectItem value="quarter">Quarter-End</SelectItem>
          <SelectItem value="year">Year-End</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[140px] text-center font-medium">
          {getDisplayLabel()}
        </span>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
