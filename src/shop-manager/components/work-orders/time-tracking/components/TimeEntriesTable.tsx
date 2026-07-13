
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeEntry } from "@/types/workOrder";
import { TimeEntryRow } from "./TimeEntryRow";
import { EmptyTimeEntriesTable } from "./EmptyTimeEntriesTable";

interface TimeEntriesTableProps {
  timeEntries: TimeEntry[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TimeEntriesTable({ timeEntries, onEdit, onDelete }: TimeEntriesTableProps) {
  if (timeEntries.length === 0) {
    return <EmptyTimeEntriesTable />;
  }

  return (
    <Table className="border rounded-md">
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Billable</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timeEntries.map((entry) => (
          <TimeEntryRow
            key={entry.id}
            entry={entry}
            onEdit={() => onEdit(entry.id)}
            onDelete={() => onDelete(entry.id)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
