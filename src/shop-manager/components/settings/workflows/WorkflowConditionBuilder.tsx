import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface WorkflowConditionBuilderProps {
  condition: any;
  onChange: (condition: any) => void;
  onRemove: () => void;
}

const CONDITION_TYPES = [
  { value: 'field_equals', label: 'Field Equals' },
  { value: 'field_contains', label: 'Field Contains' },
  { value: 'time_range', label: 'Time Range' },
  { value: 'custom', label: 'Custom Logic' }
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'between', label: 'Between' }
];

const WORK_ORDER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'total_cost', label: 'Total Cost' },
  { value: 'estimated_hours', label: 'Estimated Hours' },
  { value: 'technician_id', label: 'Technician' },
  { value: 'customer_id', label: 'Customer' }
];

export function WorkflowConditionBuilder({ condition, onChange, onRemove }: WorkflowConditionBuilderProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...condition, [field]: value });
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Condition</h4>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Condition Type</label>
            <Select
              value={condition.condition_type}
              onValueChange={(value) => updateField('condition_type', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Field</label>
            <Select
              value={condition.field_name}
              onValueChange={(value) => updateField('field_name', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Operator</label>
            <Select
              value={condition.operator}
              onValueChange={(value) => updateField('operator', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Value</label>
            <Input
              className="h-8"
              value={condition.condition_value?.value || ''}
              onChange={(e) => updateField('condition_value', { value: e.target.value })}
              placeholder="Enter value"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Logic Operator</label>
          <Select
            value={condition.logical_operator}
            onValueChange={(value) => updateField('logical_operator', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}