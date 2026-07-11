import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToCSV, exportToPDF } from '@/utils/export';
import { useToast } from '@/hooks/use-toast';
import type { WorkScheduleAssignment } from '@/types/scheduling';

interface ScheduleExportButtonProps {
  schedules: WorkScheduleAssignment[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ScheduleExportButton({ schedules }: ScheduleExportButtonProps) {
  const { toast } = useToast();

  const prepareExportData = () => {
    return schedules.map(schedule => ({
      'Employee': schedule.profiles 
        ? `${schedule.profiles.first_name} ${schedule.profiles.last_name}`
        : 'Unknown',
      'Day of Week': DAYS[schedule.day_of_week],
      'Schedule Name': schedule.schedule_name,
      'Shift Start': schedule.shift_start,
      'Shift End': schedule.shift_end,
      'Recurring': schedule.is_recurring ? 'Yes' : 'No',
      'Effective From': new Date(schedule.effective_from).toLocaleDateString(),
      'Effective Until': schedule.effective_until 
        ? new Date(schedule.effective_until).toLocaleDateString()
        : 'Ongoing',
      'Notes': schedule.notes || ''
    }));
  };

  const handleExportExcel = () => {
    try {
      const data = prepareExportData();
      exportToExcel(data, 'Employee_Schedules', {
        sheetName: 'Schedules',
        includeTimestamp: true
      });
      toast({
        title: 'Success',
        description: 'Schedule exported to Excel successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export to Excel',
        variant: 'destructive'
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const data = prepareExportData();
      exportToCSV(data, 'Employee_Schedules');
      toast({
        title: 'Success',
        description: 'Schedule exported to CSV successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export to CSV',
        variant: 'destructive'
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const data = prepareExportData();
      const columns = Object.keys(data[0] || {}).map(key => ({
        header: key,
        dataKey: key
      }));
      exportToPDF(data, 'Employee_Schedules', columns);
      toast({
        title: 'Success',
        description: 'Schedule exported to PDF successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export to PDF',
        variant: 'destructive'
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
