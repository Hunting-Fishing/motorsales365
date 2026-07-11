import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Clock } from 'lucide-react';

interface StaffSummary {
  name: string;
  totalHours: number;
  hourlyRate: number;
  totalPay: number;
  shifts: number;
}

interface WeeklyHoursSummaryProps {
  summaries: StaffSummary[];
  isLoading: boolean;
}

export function WeeklyHoursSummary({ summaries, isLoading }: WeeklyHoursSummaryProps) {
  if (isLoading) return <div className="flex justify-center py-10 text-muted-foreground">Loading summary...</div>;

  const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);
  const totalPay = summaries.reduce((sum, s) => sum + s.totalPay, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20"><Clock className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours This Week</p>
              <p className="text-xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/20"><DollarSign className="h-5 w-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Payroll This Week</p>
              <p className="text-xl font-bold text-foreground">${totalPay.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {summaries.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Est. Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.shifts}</TableCell>
                  <TableCell>{s.totalHours.toFixed(2)}</TableCell>
                  <TableCell>${s.hourlyRate.toFixed(2)}/hr</TableCell>
                  <TableCell className="font-semibold">${s.totalPay.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
