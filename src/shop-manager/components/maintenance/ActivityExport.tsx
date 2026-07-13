import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { Parser } from '@json2csv/plainjs';

interface ActivityExportProps {
  activities: any[];
  filename?: string;
}

export function ActivityExport({ activities, filename = 'maintenance-activities' }: ActivityExportProps) {
  const exportToCSV = () => {
    try {
      const exportData = activities.map(activity => ({
        Date: format(new Date(activity.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        Action: activity.action,
        User: activity.user_name,
        'User ID': activity.user_id,
        'Schedule ID': activity.schedule_id || 'N/A',
        'Equipment ID': activity.equipment_id || 'N/A',
        Flagged: activity.flagged ? 'Yes' : 'No',
        'Flag Reason': activity.flag_reason || 'N/A',
        Details: JSON.stringify(activity.details || {}),
      }));

      const parser = new Parser();
      const csv = parser.parse(exportData);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  };

  return (
    <Button onClick={exportToCSV} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
