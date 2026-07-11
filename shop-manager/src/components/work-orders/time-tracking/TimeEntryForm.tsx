
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TimeEntry } from "@/types/workOrder";

export interface TimeEntryFormProps {
  initialData: Partial<TimeEntry>;
  onSubmit: (entryData: Partial<TimeEntry>) => void;
  onCancel: () => void;
}

export function TimeEntryForm({ initialData, onSubmit, onCancel }: TimeEntryFormProps) {
  const [formData, setFormData] = useState<Partial<TimeEntry>>({
    employee_name: initialData.employee_name || '',
    start_time: initialData.start_time || '',
    end_time: initialData.end_time || '',
    duration: initialData.duration || 0,
    notes: initialData.notes || '',
    billable: initialData.billable !== undefined ? initialData.billable : true,
    ...initialData
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, billable: checked });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const calculateDuration = () => {
    // Simple placeholder for duration calculation
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      setFormData({ ...formData, duration: durationMinutes });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">Technician Name</label>
          <Input 
            name="employee_name"
            value={formData.employee_name || ''}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm">Start Time</label>
          <Input 
            type="datetime-local"
            name="start_time"
            value={formData.start_time || ''}
            onChange={handleChange}
            onBlur={calculateDuration}
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm">End Time</label>
          <Input 
            type="datetime-local"
            name="end_time"
            value={formData.end_time || ''}
            onChange={handleChange}
            onBlur={calculateDuration}
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm">Duration (minutes)</label>
          <Input 
            type="number"
            name="duration"
            value={formData.duration || 0}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block mb-1 text-sm">Notes</label>
        <Textarea 
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          checked={formData.billable || false} 
          onCheckedChange={handleSwitchChange}
          id="billable"
        />
        <label htmlFor="billable" className="text-sm">Billable</label>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData.id ? 'Update' : 'Add'} Time Entry
        </Button>
      </div>
    </form>
  );
}
