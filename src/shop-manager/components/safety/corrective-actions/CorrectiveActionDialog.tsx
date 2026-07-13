import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CorrectiveAction } from '@/hooks/useCorrectiveActions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: CorrectiveAction | null;
  onSave: (data: Partial<CorrectiveAction>) => void;
}

export function CorrectiveActionDialog({ open, onOpenChange, action, onSave }: Props) {
  const [formData, setFormData] = React.useState<{
    title: string;
    description: string;
    action_type: 'corrective' | 'preventive';
    priority: 'low' | 'medium' | 'high' | 'critical';
    due_date: string;
    root_cause: string;
    preventive_measures: string;
  }>({
    title: '',
    description: '',
    action_type: 'corrective',
    priority: 'medium',
    due_date: '',
    root_cause: '',
    preventive_measures: ''
  });

  React.useEffect(() => {
    if (action) {
      setFormData({
        title: action.title || '',
        description: action.description || '',
        action_type: action.action_type || 'corrective',
        priority: action.priority || 'medium',
        due_date: action.due_date || '',
        root_cause: action.root_cause || '',
        preventive_measures: action.preventive_measures || ''
      });
    } else {
      setFormData({ title: '', description: '', action_type: 'corrective', priority: 'medium', due_date: '', root_cause: '', preventive_measures: '' });
    }
  }, [action]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{action ? 'Edit Corrective Action' : 'New Corrective Action'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
          <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <Select value={formData.action_type} onValueChange={v => setFormData({...formData, action_type: v as 'corrective' | 'preventive'})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as 'low' | 'medium' | 'high' | 'critical'})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
          <div><Label>Root Cause</Label><Textarea value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} /></div>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
