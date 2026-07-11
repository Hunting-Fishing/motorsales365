
import React from "react";
import { TimeEntry } from "@/types/workOrder";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

interface TimeEntryRowProps {
  entry: TimeEntry;
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
}

export function TimeEntryRow({ entry, onDelete, onEdit }: TimeEntryRowProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <tr>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
        {entry.employee_name}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
        <div>
          <span className="font-medium">{entry.start_time ? format(new Date(entry.start_time), "MMM d, yyyy") : ""}</span>
          <br />
          <span className="text-xs">
            {entry.start_time ? format(new Date(entry.start_time), "h:mm a") : ""} 
            {entry.end_time ? ` - ${format(new Date(entry.end_time), "h:mm a")}` : ""}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-900 font-medium">
        {formatDuration(entry.duration)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
        {entry.billable ? (
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
        <button
          type="button"
          className="text-blue-600 hover:text-blue-800 mr-3"
          onClick={() => onEdit(entry)}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-red-600 hover:text-red-800"
          onClick={() => onDelete(entry.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
