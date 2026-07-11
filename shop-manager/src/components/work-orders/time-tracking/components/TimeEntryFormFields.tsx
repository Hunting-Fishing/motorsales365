
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface TimeEntryFormFieldsProps {
  employee: string;
  setEmployee: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  billable: boolean;
  setBillable: (value: boolean) => void;
}

export function TimeEntryFormFields({
  employee,
  setEmployee,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  duration,
  setDuration,
  notes,
  setNotes,
  billable,
  setBillable
}: TimeEntryFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="employee">Employee</Label>
        <Input 
          id="employee"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          placeholder="Employee Name"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input 
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input 
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input 
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input 
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (hours)</Label>
          <Input 
            id="duration"
            type="number"
            step="0.25"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Auto-calculated if empty"
          />
          <p className="text-xs text-slate-500 mt-1">
            Override automatic calculation (optional)
          </p>
        </div>
        <div className="flex items-center justify-start h-full pt-7">
          <div className="flex items-center space-x-2">
            <Switch 
              id="billable" 
              checked={billable} 
              onCheckedChange={setBillable} 
            />
            <Label htmlFor="billable">Billable Time</Label>
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea 
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Work performed, issues encountered, etc."
          className="h-24"
        />
      </div>
    </div>
  );
}
