
import { useEffect, useState } from "react";

interface CurrentTimeIndicatorProps {
  currentTime: Date;
  view: "day" | "week";
}

export function CurrentTimeIndicator({ currentTime, view }: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    // Calculate position based on current time
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // For time slots from 8am (8) to 6pm (18) - 11 hours total
    // Normalize to 0-1 range within our displayed time range
    const timeRange = 11; // 11 hours displayed (8am-6pm)
    const startHour = 8; // Starting from 8am
    
    let normalizedTime = 0;
    if (hours >= startHour && hours <= startHour + timeRange) {
      normalizedTime = (hours - startHour) / timeRange;
      // Add minutes as fraction of hour
      normalizedTime += (minutes / 60) / timeRange;
    } else if (hours > startHour + timeRange) {
      normalizedTime = 1; // After 6pm
    }
    
    // Convert to position in the container (approx. 80px per hour in the UI)
    const hourHeight = 80;
    const totalHeight = timeRange * hourHeight;
    setPosition(normalizedTime * totalHeight);
  }, [currentTime]);

  if (view !== "day" && view !== "week") return null;

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none" 
      style={{ top: `${position + 45}px` }} // Adding offset for header
    >
      <div className="flex items-center w-full">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse ml-1"></div>
        <div className="h-[2px] bg-red-500 flex-grow"></div>
        <div className="text-xs bg-red-500 text-white px-1 rounded-sm">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      {/* Past time overlay - only applies to the area above the current time */}
      <div 
        className="absolute left-0 right-0 bg-red-50 bg-opacity-20 pointer-events-none z-0" 
        style={{ 
          top: -position - 45, // Position it from the top of the calendar
          height: `${position + 45}px` // Only cover the area up to the current time
        }} 
      />
    </div>
  );
}
