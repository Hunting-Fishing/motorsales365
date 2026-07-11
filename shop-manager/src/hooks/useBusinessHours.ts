
import { useMemo } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export const useBusinessHours = () => {
  const { businessHours } = useCompany();

  const isBusinessDay = (dayOfWeek: number): boolean => {
    const dayHours = businessHours.find((h: BusinessHour) => h.day_of_week === dayOfWeek);
    return dayHours ? !dayHours.is_closed : true;
  };

  const getBusinessHours = (dayOfWeek: number) => {
    const dayHours = businessHours.find((h: BusinessHour) => h.day_of_week === dayOfWeek);
    if (!dayHours || dayHours.is_closed) {
      return null;
    }
    return {
      open: dayHours.open_time,
      close: dayHours.close_time
    };
  };

  const isTimeWithinBusinessHours = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const hours = getBusinessHours(dayOfWeek);
    
    if (!hours) return false;

    const timeStr = date.toTimeString().substring(0, 5); // HH:MM format
    return timeStr >= hours.open && timeStr <= hours.close;
  };

  const getAvailableTimeSlots = (date: Date, slotDurationMinutes = 60): string[] => {
    const dayOfWeek = date.getDay();
    const hours = getBusinessHours(dayOfWeek);
    
    if (!hours) return [];

    const slots: string[] = [];
    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);
    
    const startTime = openHour * 60 + openMinute;
    const endTime = closeHour * 60 + closeMinute;
    
    for (let time = startTime; time < endTime; time += slotDurationMinutes) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
    
    return slots;
  };

  const businessDaysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => i).filter(isBusinessDay);
  }, [businessHours]);

  return {
    businessHours,
    isBusinessDay,
    getBusinessHours,
    isTimeWithinBusinessHours,
    getAvailableTimeSlots,
    businessDaysOfWeek
  };
};
