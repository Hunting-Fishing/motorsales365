import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface WorkflowActionBuilderProps {
  action: any;
  onChange: (action: any) => void;
  onRemove: () => void;
}

const ACTION_TYPES = [
  { value: 'assign_technician', label: 'Assign Technician' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'create_task', label: 'Create Task' }
];

const NOTIFICATION_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App Notification' }
];

const WORK_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export function WorkflowActionBuilder({ action, onChange, onRemove }: WorkflowActionBuilderProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...action, [field]: value });
  };

  const updateConfig = (key: string, value: any) => {
    onChange({
      ...action,
      action_config: { ...action.action_config, [key]: value }
    });
  };

  const renderActionConfig = () => {
    switch (action.action_type) {
      case 'send_notification':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notification Type</label>
              <Select
                value={action.action_config.notification_type}
                onValueChange={(value) => updateConfig('notification_type', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Message</label>
              <Textarea
                className="h-16 text-xs"
                value={action.action_config.message || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Enter notification message..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Recipients</label>
              <Input
                className="h-8"
                value={action.action_config.recipients || ''}
                onChange={(e) => updateConfig('recipients', e.target.value)}
                placeholder="technician, customer, manager"
              />
            </div>
          </div>
        );

      case 'change_status':
        return (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">New Status</label>
            <Select
              value={action.action_config.new_status}
              onValueChange={(value) => updateConfig('new_status', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'assign_technician':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Assignment Method</label>
              <Select
                value={action.action_config.assignment_method || 'auto'}
                onValueChange={(value) => updateConfig('assignment_method', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign based on availability</SelectItem>
                  <SelectItem value="round_robin">Round robin</SelectItem>
                  <SelectItem value="least_busy">Least busy technician</SelectItem>
                  <SelectItem value="specific">Specific technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {action.action_config.assignment_method === 'specific' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Technician ID</label>
                <Input
                  className="h-8"
                  value={action.action_config.technician_id || ''}
                  onChange={(e) => updateConfig('technician_id', e.target.value)}
                  placeholder="Enter technician ID"
                />
              </div>
            )}
          </div>
        );

      case 'update_field':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Field Name</label>
              <Input
                className="h-8"
                value={action.action_config.field_name || ''}
                onChange={(e) => updateConfig('field_name', e.target.value)}
                placeholder="e.g., priority, notes"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">New Value</label>
              <Input
                className="h-8"
                value={action.action_config.new_value || ''}
                onChange={(e) => updateConfig('new_value', e.target.value)}
                placeholder="Enter new value"
              />
            </div>
          </div>
        );

      case 'create_task':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Task Title</label>
              <Input
                className="h-8"
                value={action.action_config.task_title || ''}
                onChange={(e) => updateConfig('task_title', e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Task Description</label>
              <Textarea
                className="h-16 text-xs"
                value={action.action_config.task_description || ''}
                onChange={(e) => updateConfig('task_description', e.target.value)}
                placeholder="Enter task description..."
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Select an action type to configure
          </div>
        );
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Action</h4>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Action Type</label>
            <Select
              value={action.action_type}
              onValueChange={(value) => updateField('action_type', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Delay (minutes)</label>
            <Input
              className="h-8"
              type="number"
              value={action.delay_minutes || 0}
              onChange={(e) => updateField('delay_minutes', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>

        {renderActionConfig()}
      </CardContent>
    </Card>
  );
}