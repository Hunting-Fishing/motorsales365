
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon } from "lucide-react";
import { TimeEntry } from "@/types/workOrder";
import { formatTimeInHoursAndMinutes } from "@/utils/workOrders";
import { TimeEntryRow } from "./components/TimeEntryRow";

interface TimeEntriesListProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
}

export function TimeEntriesList({ entries, onEdit, onDelete }: TimeEntriesListProps) {
  const getTotalDuration = () => {
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };
  
  const getBillableDuration = () => {
    return entries
      .filter(entry => entry.billable)
      .reduce((total, entry) => total + (entry.duration || 0), 0);
  };
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md bg-slate-50">
        <p className="text-slate-500">No time entries recorded</p>
        <p className="text-sm text-slate-400">Add time entries to track work performed</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left py-2 px-4">Technician</th>
              <th className="text-left py-2 px-4">Date</th>
              <th className="text-left py-2 px-4">Duration</th>
              <th className="text-left py-2 px-4">Billable</th>
              <th className="text-left py-2 px-4">Notes</th>
              <th className="text-right py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t hover:bg-slate-50">
                <td className="py-3 px-4">{entry.employee_name}</td>
                <td className="py-3 px-4">{entry.start_time}</td>
                <td className="py-3 px-4">{formatTimeInHoursAndMinutes(entry.duration)}</td>
                <td className="py-3 px-4">{entry.billable ? "Yes" : "No"}</td>
                <td className="py-3 px-4">{entry.notes}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(entry)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(entry.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-slate-50 font-medium">
              <td colSpan={2} className="py-2 px-4 text-right">Total:</td>
              <td className="py-2 px-4">{formatTimeInHoursAndMinutes(getTotalDuration())}</td>
              <td colSpan={3}></td>
            </tr>
            <tr className="border-t bg-slate-50 font-medium">
              <td colSpan={2} className="py-2 px-4 text-right">Billable:</td>
              <td className="py-2 px-4">{formatTimeInHoursAndMinutes(getBillableDuration())}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
