
import React from "react";
import { format, formatDistanceToNow } from "date-fns";

interface DateDisplayProps {
  timestamp: string;
}

export const DateDisplay = ({ timestamp }: DateDisplayProps) => {
  if (!timestamp) return <span>Unknown</span>;
  
  const date = new Date(timestamp);
  
  return (
    <div className="flex flex-col">
      <span>{format(date, 'MMM d, yyyy')}</span>
      <span className="text-xs text-muted-foreground">
        {format(date, 'h:mm a')}
      </span>
      <span className="text-xs text-muted-foreground">
        ({formatDistanceToNow(date, { addSuffix: true })})
      </span>
    </div>
  );
};
