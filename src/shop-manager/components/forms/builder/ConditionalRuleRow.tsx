import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { ConditionalRule, ConditionOperator, ConditionType, FormBuilderField } from '@/types/formBuilder';

interface ConditionalRuleRowProps {
  rule: ConditionalRule;
  availableFields: FormBuilderField[];
  onUpdate: (updates: Partial<ConditionalRule>) => void;
  onDelete: () => void;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const CONDITION_TYPES: { value: ConditionType; label: string }[] = [
  { value: 'show', label: 'Show this field' },
  { value: 'hide', label: 'Hide this field' },
];

export const ConditionalRuleRow: React.FC<ConditionalRuleRowProps> = ({
  rule,
  availableFields,
  onUpdate,
  onDelete,
}) => {
  const selectedField = availableFields.find(f => f.id === rule.conditionFieldId);
  const needsValue = !['is_empty', 'is_not_empty'].includes(rule.conditionOperator);
  
  // Get options if the selected field is a select or radio
  const fieldOptions = selectedField?.options || [];
  const hasOptions = fieldOptions.length > 0;

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>When</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Field Selector */}
        <Select
          value={rule.conditionFieldId}
          onValueChange={(value) => onUpdate({ conditionFieldId: value, conditionValue: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label || 'Untitled Field'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator Selector */}
        <Select
          value={rule.conditionOperator}
          onValueChange={(value) => onUpdate({ conditionOperator: value as ConditionOperator })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operator..." />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        {needsValue && (
          hasOptions ? (
            <Select
              value={rule.conditionValue}
              onValueChange={(value) => onUpdate({ conditionValue: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={rule.conditionValue}
              onChange={(e) => onUpdate({ conditionValue: e.target.value })}
              placeholder="Enter value..."
            />
          )
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Action Type */}
        <Select
          value={rule.conditionType}
          onValueChange={(value) => onUpdate({ conditionType: value as ConditionType })}
        >
          <SelectTrigger className="w-48">
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

        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};
