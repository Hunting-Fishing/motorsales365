
import { SavedReport } from "@/types/reports";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface ReportsListProps {
  savedReports: SavedReport[];
  onLoadReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  setIsOpen: (isOpen: boolean) => void;
}

export function ReportsList({
  savedReports,
  onLoadReport,
  onDeleteReport,
  setIsOpen
}: ReportsListProps) {
  if (savedReports.length === 0) return null;
  
  return (
    <div className="mt-4">
      <Label>Your Saved Reports</Label>
      <ScrollArea className="h-[200px] mt-2 border rounded-md p-4">
        <div className="space-y-4">
          {savedReports.map((report) => (
            <div key={report.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <h4 className="font-medium">{report.name}</h4>
                <p className="text-sm text-muted-foreground">{report.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString()}
                  {report.scheduled && ` • Scheduled ${report.scheduled.frequency}`}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onLoadReport(report.id);
                    setIsOpen(false);
                  }}
                >
                  Load
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDeleteReport(report.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
