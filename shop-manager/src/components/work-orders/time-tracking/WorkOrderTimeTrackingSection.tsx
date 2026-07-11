
import React from 'react';
import { TimeEntry } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Timer, DollarSign } from 'lucide-react';

interface WorkOrderTimeTrackingSectionProps {
  workOrderId: string;
  timeEntries: TimeEntry[];
  onTimeEntriesChange: (timeEntries: TimeEntry[]) => void;
  isEditMode: boolean;
}

export function WorkOrderTimeTrackingSection({
  workOrderId,
  timeEntries,
  onTimeEntriesChange,
  isEditMode
}: WorkOrderTimeTrackingSectionProps) {
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const billableHours = timeEntries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => sum + entry.duration, 0);

  const formatHours = (minutes: number) => {
    return (minutes / 60).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Time Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 via-white to-blue-50/30 border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-blue-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900">{formatHours(totalHours)}h</p>
            <p className="text-sm text-blue-600 mt-1">All time entries</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 via-white to-green-50/30 border-green-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-green-800">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              Billable Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-900">{formatHours(billableHours)}h</p>
            <p className="text-sm text-green-600 mt-1">Billable time only</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries List */}
      <Card className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border-slate-200/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900">
            <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
              <Timer className="h-5 w-5 text-white" />
            </div>
            Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-dashed border-slate-300">
              <Timer className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium mb-2">No time entries recorded yet</p>
              <p className="text-slate-500">Time tracking will appear here when entries are added</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-slate-900">{entry.employee_name}</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          entry.billable 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {entry.billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </div>
                      <p className="text-lg font-medium text-slate-800 mb-1">
                        {formatHours(entry.duration)} hours
                      </p>
                      {entry.notes && (
                        <p className="text-slate-600 text-sm bg-slate-50 rounded-md p-3 border border-slate-200/60">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 font-medium">
                        {new Date(entry.start_time).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(entry.start_time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
