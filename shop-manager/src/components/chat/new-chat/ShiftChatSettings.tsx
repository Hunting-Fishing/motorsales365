
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon } from "lucide-react";

interface ShiftChatSettingsProps {
  isShiftChat: boolean;
  setIsShiftChat: (value: boolean) => void;
  shiftDate: Date | undefined;
  setShiftDate: (date: Date | undefined) => void;
  shiftName: string;
  setShiftName: (name: string) => void;
  shiftTimeStart: string;
  setShiftTimeStart: (time: string) => void;
  shiftTimeEnd: string;
  setShiftTimeEnd: (time: string) => void;
}

export const ShiftChatSettings: React.FC<ShiftChatSettingsProps> = ({
  isShiftChat,
  setIsShiftChat,
  shiftDate,
  setShiftDate,
  shiftName,
  setShiftName,
  shiftTimeStart,
  setShiftTimeStart,
  shiftTimeEnd,
  setShiftTimeEnd
}) => {
  if (!isShiftChat) {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <Switch id="shift-chat" checked={isShiftChat} onCheckedChange={setIsShiftChat} />
        <Label htmlFor="shift-chat" className="cursor-pointer">
          This is a shift communication chat
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4 border p-4 rounded-md bg-slate-50">
      <div className="flex items-center space-x-2 mb-2">
        <Switch id="shift-chat" checked={isShiftChat} onCheckedChange={setIsShiftChat} />
        <Label htmlFor="shift-chat" className="cursor-pointer font-medium">
          Shift Communication Chat
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-name">Shift Name</Label>
        <Input 
          id="shift-name" 
          placeholder="Morning Shift, Afternoon Shift, etc." 
          value={shiftName}
          onChange={(e) => setShiftName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Shift Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {shiftDate ? format(shiftDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={shiftDate}
              onSelect={setShiftDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shift-time-start">Start Time</Label>
          <Input 
            id="shift-time-start" 
            type="time" 
            value={shiftTimeStart}
            onChange={(e) => setShiftTimeStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift-time-end">End Time</Label>
          <Input 
            id="shift-time-end" 
            type="time" 
            value={shiftTimeEnd}
            onChange={(e) => setShiftTimeEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground mt-2">
        Team members assigned to this shift will be automatically added to the chat.
      </div>
    </div>
  );
};
