import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Calendar, Ship, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { AddTimesheetEntryDialog } from '@/components/timesheet/AddTimesheetEntryDialog';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

export default function Timesheet() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { entries, totals, isLoading, deleteEntry } = useTimesheet(selectedWeek);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'vessel':
        return <Ship className="w-4 h-4" />;
      case 'yard':
      case 'shop':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <div>Loading timesheet...</div>;
  }

  return (
    <>
      <Helmet>
        <title>My Timesheet | All Business 365</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Clock className="mr-3 h-8 w-8" />
              My Timesheet
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your work hours and assignments
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
              >
                Previous Week
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week of {format(selectedWeek, 'MMM d, yyyy')}
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
              >
                Next Week
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals?.totalHours.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals?.overtimeHours.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                OT hours logged
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals?.billableHours.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                Client billable
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Timesheet Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
            <CardDescription>
              {entries && entries.length > 0 
                ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} for this week`
                : 'No entries for this week'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!entries || entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No time entries for this week</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  Add Your First Entry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{format(new Date(entry.work_date), 'EEEE, MMM d, yyyy')}</h3>
                            {getStatusBadge(entry.status)}
                            {entry.is_overtime && <Badge variant="outline" className="border-orange-500 text-orange-500">Overtime</Badge>}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{entry.start_time} - {entry.end_time || 'In Progress'}</span>
                            <span className="font-medium text-foreground">{entry.total_hours.toFixed(2)} hrs</span>
                            {entry.break_minutes > 0 && <span>({entry.break_minutes}min break)</span>}
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {getLocationIcon(entry.work_location_type)}
                            <span className="capitalize">{entry.work_location_type}</span>
                            {entry.equipment_assets && (
                              <span className="text-muted-foreground">
                                • {entry.equipment_assets.name}
                                {entry.equipment_assets.asset_number && ` (${entry.equipment_assets.asset_number})`}
                              </span>
                            )}
                          </div>

                          <p className="text-sm">{entry.work_description}</p>

                          {entry.notes && (
                            <p className="text-sm text-muted-foreground border-l-2 pl-2">
                              {entry.notes}
                            </p>
                          )}

                          {entry.rejection_reason && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-sm text-destructive">
                              <strong>Rejection Reason:</strong> {entry.rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {entry.status === 'draft' && (
                            <>
                              <Button variant="outline" size="sm">Edit</Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (confirm('Delete this entry?')) {
                                    deleteEntry(entry.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddTimesheetEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  );
}
