import { useState, useEffect } from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElapsedTimerProps {
  startTime: string;
  className?: string;
  showIcon?: boolean;
}

export function ElapsedTimer({ startTime, className, showIcon = true }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = parseISO(startTime);
    
    // Calculate initial elapsed time
    setElapsed(differenceInSeconds(new Date(), start));

    // Update every second
    const interval = setInterval(() => {
      setElapsed(differenceInSeconds(new Date(), start));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsed = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-1.5 font-mono", className)}>
      {showIcon && <Clock className="h-3.5 w-3.5 animate-pulse" />}
      <span>{formatElapsed(elapsed)}</span>
    </div>
  );
}
