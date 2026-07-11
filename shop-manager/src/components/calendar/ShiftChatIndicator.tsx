
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { ChatRoom } from "@/types/chat";

interface ShiftChatIndicatorProps {
  date: Date;
  chatRooms: ChatRoom[];
  onClick: (e: React.MouseEvent, room: ChatRoom) => void;
}

export function ShiftChatIndicator({ date, chatRooms, onClick }: ShiftChatIndicatorProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  
  // Find chat rooms for this date
  const roomsForDate = chatRooms.filter(room => 
    room.metadata?.shift_date === dateStr);
  
  if (roomsForDate.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute bottom-1 left-1">
      {roomsForDate.map(room => (
        <button 
          key={room.id}
          className="text-blue-500 hover:text-blue-700 transition-colors flex items-center text-xs gap-1"
          onClick={(e) => onClick(e, room)}
        >
          <CalendarPlus size={14} />
          <span className="hidden sm:inline">Shift</span>
        </button>
      ))}
    </div>
  );
}
