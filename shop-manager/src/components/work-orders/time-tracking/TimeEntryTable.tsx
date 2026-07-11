
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { TimeEntry } from "@/types/workOrder";
import { formatTimeInHoursAndMinutes } from "@/utils/workOrders";
import { format } from "date-fns";

interface TimeEntryTableProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
}

export function TimeEntryTable({ entries, onEdit, onDelete }: TimeEntryTableProps) {
  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateTimeStr;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technician</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-center">Billable</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.employee_name}</TableCell>
            <TableCell>{formatDateTime(entry.start_time)}</TableCell>
            <TableCell>{entry.end_time ? formatDateTime(entry.end_time) : "N/A"}</TableCell>
            <TableCell className="text-right">{formatTimeInHoursAndMinutes(entry.duration)}</TableCell>
            <TableCell className="max-w-xs truncate">{entry.notes}</TableCell>
            <TableCell className="text-center">
              {entry.billable ? "Yes" : "No"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(entry)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
