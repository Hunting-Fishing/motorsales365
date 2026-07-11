import React, { useState } from 'react';
import { TimeEntry } from '@/types/workOrder';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

interface TimeTrackingProps {
  workOrderId: string; // Changed from 'workOrder' to 'workOrderId'
  timeEntries: TimeEntry[];
  onUpdateTimeEntries: (entries: TimeEntry[]) => void;
}

export function WorkOrderTimeTracking({ 
  workOrderId, // Use workOrderId instead of workOrder
  timeEntries, 
  onUpdateTimeEntries 
}: TimeTrackingProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const handleAddEntry = () => {
    setEditingEntry(null);
    setShowAddForm(true);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setShowAddForm(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    const updatedEntries = timeEntries.filter(entry => entry.id !== entryId);
    onUpdateTimeEntries(updatedEntries);
  };

  const handleSaveEntry = (entry: TimeEntry) => {
    let updatedEntries: TimeEntry[];
    
    if (editingEntry) {
      // Update existing entry
      updatedEntries = timeEntries.map(e => 
        e.id === entry.id ? entry : e
      );
    } else {
      // Add new entry
      updatedEntries = [...timeEntries, entry];
    }
    
    onUpdateTimeEntries(updatedEntries);
    setShowAddForm(false);
    setEditingEntry(null);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingEntry(null);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderTimeEntries = () => {
    return timeEntries.map(entry => (
      <tr key={entry.id}>
        <td className="px-4 py-2 border-b">{entry.employee_name}</td>
        <td className="px-4 py-2 border-b">
          {entry.start_time && format(new Date(entry.start_time), 'MMM d, yyyy')}
        </td>
        <td className="px-4 py-2 border-b">
          {entry.start_time && format(new Date(entry.start_time), 'h:mm a')}
          {entry.end_time && ` - ${format(new Date(entry.end_time), 'h:mm a')}`}
        </td>
        <td className="px-4 py-2 border-b text-center">{formatDuration(entry.duration)}</td>
        <td className="px-4 py-2 border-b text-center">{entry.billable ? 'Yes' : 'No'}</td>
        <td className="px-4 py-2 border-b text-right">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditEntry(entry)}
            className="text-blue-600 hover:text-blue-800 mr-2"
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDeleteEntry(entry.id)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </Button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Time Tracking</h2>
        <Button 
          onClick={handleAddEntry} 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Time Entry
        </Button>
      </div>

      {showAddForm ? (
        <div className="bg-slate-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-4">
            {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
          </h3>
          
          {/* Time entry form would go here */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleCancelForm}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              form="time-entry-form"
            >
              {editingEntry ? 'Update' : 'Add'} Entry
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billable
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    No time entries recorded yet.
                  </td>
                </tr>
              ) : (
                renderTimeEntries()
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
