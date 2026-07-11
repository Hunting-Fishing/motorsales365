import { GymCalendar } from '@/components/personal-trainer/calendar/GymCalendar';

export default function PersonalTrainerCalendar() {
  return (
    <div className="p-4 md:p-6 h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Gym Calendar</h1>
        <p className="text-sm text-muted-foreground">Manage classes, events, notifications, closures & more</p>
      </div>
      <GymCalendar />
    </div>
  );
}
