
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportScheduleForm } from "./ReportScheduleForm";

interface ReportFormProps {
  reportName: string;
  reportDescription: string;
  scheduleReport: boolean;
  scheduleFrequency: string;
  scheduleEmail: string;
  setReportName: (value: string) => void;
  setReportDescription: (value: string) => void;
  setScheduleReport: (checked: boolean) => void;
  setScheduleFrequency: (value: string) => void;
  setScheduleEmail: (value: string) => void;
}

export function ReportForm({
  reportName,
  reportDescription,
  scheduleReport,
  scheduleFrequency,
  scheduleEmail,
  setReportName,
  setReportDescription,
  setScheduleReport,
  setScheduleFrequency,
  setScheduleEmail
}: ReportFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="report-name">Report Name</Label>
        <Input
          id="report-name"
          placeholder="Monthly Sales Overview"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="report-description">Description (Optional)</Label>
        <Input
          id="report-description"
          placeholder="Sales data for the current month"
          value={reportDescription}
          onChange={(e) => setReportDescription(e.target.value)}
        />
      </div>
      
      <ReportScheduleForm
        scheduleReport={scheduleReport}
        scheduleFrequency={scheduleFrequency}
        scheduleEmail={scheduleEmail}
        setScheduleReport={setScheduleReport}
        setScheduleFrequency={setScheduleFrequency}
        setScheduleEmail={setScheduleEmail}
      />
    </div>
  );
}
