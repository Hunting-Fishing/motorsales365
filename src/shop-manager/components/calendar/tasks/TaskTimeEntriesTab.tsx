import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Play, Square, Plus, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskTimeEntriesTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
}

export function TaskTimeEntriesTab({ taskData }: TaskTimeEntriesTabProps) {
  const {
    timeEntries,
    totalTimeMinutes,
    activeTimeEntry,
    clockIn,
    clockOut,
    addTimeEntry,
    deleteTimeEntry,
    currentUserName,
  } = taskData;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleClockIn = () => {
    clockIn();
  };

  const handleClockOut = () => {
    if (activeTimeEntry) {
      clockOut(activeTimeEntry.id);
    }
  };

  const handleAddEntry = () => {
    if (!startTime || !endTime) return;
    addTimeEntry({ startTime, endTime, notes: notes || undefined });
    setShowAddDialog(false);
    setStartTime('');
    setEndTime('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Clock In/Out and Add */}
      <div className="flex gap-2">
        {activeTimeEntry ? (
          <Button onClick={handleClockOut} variant="destructive" className="flex-1">
            <Square className="h-4 w-4 mr-2" />
            Clock Out
          </Button>
        ) : (
          <Button onClick={handleClockIn} className="flex-1 bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-2" />
            Clock In
          </Button>
        )}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>
              <Button onClick={handleAddEntry} className="w-full" disabled={!startTime || !endTime}>
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Timer */}
      {activeTimeEntry && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium text-green-700">Timer Running</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Started {format(new Date(activeTimeEntry.start_time!), 'h:mm a')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Time */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Time</span>
            </div>
            <span className="text-xl font-bold">{formatDuration(totalTimeMinutes)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <div className="space-y-2">
        {timeEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No time entries yet</p>
              <p className="text-sm">Clock in or add a manual entry</p>
            </CardContent>
          </Card>
        ) : (
          timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{entry.employee_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.start_time && format(new Date(entry.start_time), 'MMM d, h:mm a')}
                      {entry.end_time && ` — ${format(new Date(entry.end_time), 'h:mm a')}`}
                      {!entry.end_time && ' — In Progress'}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDuration(entry.duration)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTimeEntry(entry.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
