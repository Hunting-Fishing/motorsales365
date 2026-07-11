
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ReportScheduleFormProps {
  scheduleReport: boolean;
  scheduleFrequency: string;
  scheduleEmail: string;
  setScheduleReport: (checked: boolean) => void;
  setScheduleFrequency: (value: string) => void;
  setScheduleEmail: (value: string) => void;
}

export function ReportScheduleForm({
  scheduleReport,
  scheduleFrequency,
  scheduleEmail,
  setScheduleReport,
  setScheduleFrequency,
  setScheduleEmail
}: ReportScheduleFormProps) {
  return (
    <>
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="schedule-report" 
          checked={scheduleReport}
          onCheckedChange={(checked) => setScheduleReport(checked === true)}
        />
        <Label htmlFor="schedule-report">Schedule this report</Label>
      </div>
      
      {scheduleReport && (
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div className="grid gap-2">
            <Label htmlFor="schedule-frequency">Frequency</Label>
            <Select
              value={scheduleFrequency}
              onValueChange={setScheduleFrequency}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="schedule-email">Email</Label>
            <Input
              id="schedule-email"
              type="email"
              placeholder="example@company.com"
              value={scheduleEmail}
              onChange={(e) => setScheduleEmail(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
