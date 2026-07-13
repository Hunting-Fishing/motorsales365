import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, GitBranch } from 'lucide-react';
import { ConditionalRule, FormBuilderField } from '@/types/formBuilder';
import { ConditionalRuleRow } from './ConditionalRuleRow';
import { v4 as uuidv4 } from 'uuid';

interface ConditionalRulesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormBuilderField;
  allFields: FormBuilderField[];
  onUpdateRules: (rules: ConditionalRule[]) => void;
}

export const ConditionalRulesEditor: React.FC<ConditionalRulesEditorProps> = ({
  open,
  onOpenChange,
  field,
  allFields,
  onUpdateRules,
}) => {
  const rules = field.conditionalRules || [];
  
  // Filter out the current field from available fields
  const availableFields = allFields.filter(f => f.id !== field.id);

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      id: uuidv4(),
      formFieldId: field.id,
      conditionFieldId: availableFields[0]?.id || '',
      conditionType: 'show',
      conditionOperator: 'equals',
      conditionValue: '',
    };
    onUpdateRules([...rules, newRule]);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    onUpdateRules(
      rules.map(r => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    onUpdateRules(rules.filter(r => r.id !== ruleId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Conditional Logic for "{field.label || 'Untitled Field'}"
          </DialogTitle>
          <DialogDescription>
            Configure when this field should be shown or hidden based on other field values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {availableFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add more fields to the form to create conditional rules.</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <GitBranch className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-4">No conditions configured</p>
              <Button onClick={handleAddRule} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <ConditionalRuleRow
                    key={rule.id}
                    rule={rule}
                    availableFields={availableFields}
                    onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                    onDelete={() => handleDeleteRule(rule.id)}
                  />
                ))}
              </div>

              <Button onClick={handleAddRule} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Condition
              </Button>

              {rules.length > 1 && (
                <p className="text-xs text-muted-foreground text-center">
                  Multiple conditions use AND logic (all must be true)
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
