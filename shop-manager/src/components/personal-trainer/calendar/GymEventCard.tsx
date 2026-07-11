import { cn } from '@/lib/utils';

export interface GymEvent {
  id: string;
  shop_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  location?: string;
  color?: string;
  max_signups?: number;
  current_signups: number;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  class: { label: 'Class', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-700' },
  signup: { label: 'Signup', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-300 dark:border-green-700' },
  notification: { label: 'Notice', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-yellow-300 dark:border-yellow-700' },
  closed_day: { label: 'Closed', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700' },
  health_concern: { label: 'Health', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-300 dark:border-orange-700' },
  event: { label: 'Event', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-300 dark:border-purple-700' },
  maintenance: { label: 'Maint.', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900/40', border: 'border-gray-300 dark:border-gray-700' },
};

interface GymEventCardProps {
  event: GymEvent;
  compact?: boolean;
  onClick?: (event: GymEvent) => void;
}

export function GymEventCard({ event, compact = false, onClick }: GymEventCardProps) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.event;

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(event)}
        className={cn(
          'w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate border-l-2 transition-opacity hover:opacity-80',
          config.bg, config.color, config.border
        )}
      >
        {event.title}
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(event)}
      className={cn(
        'w-full text-left p-2 rounded-lg border transition-all hover:shadow-md',
        config.bg, config.color, config.border
      )}
    >
      <div className="font-semibold text-sm truncate">{event.title}</div>
      {event.location && <div className="text-xs opacity-70 truncate">{event.location}</div>}
      {event.max_signups && (
        <div className="text-xs mt-0.5 opacity-70">
          {event.current_signups}/{event.max_signups} spots
        </div>
      )}
    </button>
  );
}
