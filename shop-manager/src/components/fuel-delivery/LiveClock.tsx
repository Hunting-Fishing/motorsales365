import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
  showSeconds?: boolean;
}

export function LiveClock({ className = '', showDate = false, showSeconds = true }: LiveClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeFormat = showSeconds ? 'h:mm:ss a' : 'h:mm a';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4" />
      <div className="text-sm font-medium">
        {format(currentTime, timeFormat)}
        {showDate && (
          <span className="ml-2 opacity-80">
            {format(currentTime, 'EEE, MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}
