import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

interface CreateEquipmentTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  shopId?: string;
  task?: any | null;
  onSuccess: () => void;
}

const TASK_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'maintenance_prep', label: 'Maintenance Prep' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const RECURRENCE_PATTERNS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'hours_based', label: 'Hours Based' },
];

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function CreateEquipmentTaskDialog({ 
  open, 
  onOpenChange, 
  equipmentId, 
  shopId,
  task,
  onSuccess 
}: CreateEquipmentTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserShopId, setCurrentUserShopId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    estimated_hours: '',
    notes: '',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: '1',
    recurrence_end_date: '',
  });

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      loadCurrentUserShopId();
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          task_type: task.task_type || 'general',
          priority: task.priority || 'medium',
          assigned_to: task.assigned_to || '',
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          estimated_hours: task.estimated_hours?.toString() || '',
          notes: task.notes || '',
          is_recurring: task.is_recurring || false,
          recurrence_pattern: task.recurrence_pattern || 'weekly',
          recurrence_interval: task.recurrence_interval?.toString() || '1',
          recurrence_end_date: task.recurrence_end_date ? task.recurrence_end_date.split('T')[0] : '',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          task_type: 'general',
          priority: 'medium',
          assigned_to: '',
          due_date: '',
          estimated_hours: '',
          notes: '',
          is_recurring: false,
          recurrence_pattern: 'weekly',
          recurrence_interval: '1',
          recurrence_end_date: '',
        });
      }
    }
  }, [open, task]);

  const loadCurrentUserShopId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single();
      if (profile?.shop_id) {
        setCurrentUserShopId(profile.shop_id);
      }
    }
  };

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .order('first_name');
    setTeamMembers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    // Use the current user's shop_id if available, fallback to prop
    const effectiveShopId = currentUserShopId || shopId;
    if (!effectiveShopId) {
      toast.error('Unable to determine shop. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const assignee = teamMembers.find(m => m.id === formData.assigned_to);
      const assigneeName = assignee 
        ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
        : null;

      const taskData: any = {
        equipment_id: equipmentId,
        shop_id: effectiveShopId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
        assigned_to_name: assigneeName,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        notes: formData.notes.trim() || null,
        is_recurring: formData.is_recurring,
      };

      if (formData.is_recurring) {
        taskData.recurrence_pattern = formData.recurrence_pattern;
        taskData.recurrence_interval = parseInt(formData.recurrence_interval) || 1;
        taskData.recurrence_end_date = formData.recurrence_end_date 
          ? new Date(formData.recurrence_end_date).toISOString() 
          : null;
      }

      if (task) {
        const { error } = await supabase
          .from('equipment_tasks')
          .update(taskData)
          .eq('id', task.id);
        if (error) throw error;
        toast.success('Task updated');
      } else {
        const { error } = await supabase
          .from('equipment_tasks')
          .insert(taskData);
        if (error) throw error;
        toast.success('Task created');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Task Type</Label>
              <Select 
                value={formData.task_type} 
                onValueChange={(v) => setFormData({ ...formData, task_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Assign To</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name || member.last_name 
                      ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                      : member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Recurring Task Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="is_recurring" className="cursor-pointer">Make this a recurring task</Label>
              </div>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Recurrence Pattern</Label>
                    <Select 
                      value={formData.recurrence_pattern} 
                      onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_PATTERNS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recurrence_interval">
                      {formData.recurrence_pattern === 'hours_based' ? 'Every N Hours' : 'Interval'}
                    </Label>
                    <Input
                      id="recurrence_interval"
                      type="number"
                      min="1"
                      value={formData.recurrence_interval}
                      onChange={(e) => setFormData({ ...formData, recurrence_interval: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="recurrence_end_date">End Date (Optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
