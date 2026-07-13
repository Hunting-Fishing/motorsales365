
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SavedReport } from "@/types/reports";
import { ReportForm } from "./ReportForm";
import { ReportsList } from "./ReportsList";
import { useReportForm } from "@/hooks/useReportForm";

interface SavedReportsDialogProps {
  savedReports: SavedReport[];
  onSaveReport: (report: SavedReport) => void;
  onLoadReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  currentReport: {
    title: string;
    type: string;
    filters: Record<string, any>;
  };
}

export function SavedReportsDialog({
  savedReports,
  onSaveReport,
  onLoadReport,
  onDeleteReport,
  currentReport
}: SavedReportsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { formState, formActions } = useReportForm({
    currentReport,
    onSaveReport
  });

  const handleSaveReport = () => {
    const success = formActions.handleSaveReport();
    if (success) {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Saved Reports</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Saved Reports</DialogTitle>
          <DialogDescription>
            Save your current report configuration or load a previously saved report.
          </DialogDescription>
        </DialogHeader>

        <ReportForm
          reportName={formState.reportName}
          reportDescription={formState.reportDescription}
          scheduleReport={formState.scheduleReport}
          scheduleFrequency={formState.scheduleFrequency}
          scheduleEmail={formState.scheduleEmail}
          setReportName={formActions.setReportName}
          setReportDescription={formActions.setReportDescription}
          setScheduleReport={formActions.setScheduleReport}
          setScheduleFrequency={formActions.setScheduleFrequency}
          setScheduleEmail={formActions.setScheduleEmail}
        />
        
        <ReportsList
          savedReports={savedReports}
          onLoadReport={onLoadReport}
          onDeleteReport={onDeleteReport}
          setIsOpen={setIsOpen}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveReport}>Save Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
