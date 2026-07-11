import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ShiftEntry {
  id: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  status: string;
  notes: string | null;
}

interface ShiftLogTableProps {
  entries: ShiftEntry[];
  isLoading: boolean;
}

export function ShiftLogTable({ entries, isLoading }: ShiftLogTableProps) {
  if (isLoading) return <div className="flex justify-center py-10 text-muted-foreground">Loading shifts...</div>;
  if (entries.length === 0) return <div className="flex justify-center py-10 text-muted-foreground">No shift entries found</div>;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Break</TableHead>
            <TableHead>Total Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.staff_name}</TableCell>
              <TableCell>{format(new Date(entry.clock_in), 'MMM d, yyyy')}</TableCell>
              <TableCell>{format(new Date(entry.clock_in), 'h:mm a')}</TableCell>
              <TableCell>{entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : '—'}</TableCell>
              <TableCell>{entry.break_minutes}m</TableCell>
              <TableCell>{entry.total_hours != null ? Number(entry.total_hours).toFixed(2) : '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  entry.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  entry.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }>
                  {entry.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
