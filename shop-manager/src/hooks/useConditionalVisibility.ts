import { useMemo } from 'react';
import { ConditionalRule, FormBuilderField } from '@/types/formBuilder';

/**
 * Evaluates a single conditional rule against form values
 */
function evaluateRule(
  rule: ConditionalRule,
  formValues: Record<string, any>
): boolean {
  const fieldValue = formValues[rule.conditionFieldId];
  const conditionValue = rule.conditionValue;

  switch (rule.conditionOperator) {
    case 'equals':
      return String(fieldValue) === String(conditionValue);
    
    case 'not_equals':
      return String(fieldValue) !== String(conditionValue);
    
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
    
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
    
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    
    case 'is_empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    
    case 'is_not_empty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    
    default:
      return true;
  }
}

/**
 * Hook to determine if a field should be visible based on conditional rules
 * 
 * @param field - The field to evaluate visibility for
 * @param formValues - Current form values (keyed by field ID)
 * @returns boolean - Whether the field should be visible
 */
export function useConditionalVisibility(
  field: FormBuilderField,
  formValues: Record<string, any>
): boolean {
  return useMemo(() => {
    const rules = field.conditionalRules || [];
    
    // No rules means always visible
    if (rules.length === 0) {
      return true;
    }

    // Evaluate all rules (AND logic - all must pass)
    for (const rule of rules) {
      const conditionMet = evaluateRule(rule, formValues);
      
      if (rule.conditionType === 'show') {
        // For "show" rules: if condition is NOT met, hide the field
        if (!conditionMet) {
          return false;
        }
      } else if (rule.conditionType === 'hide') {
        // For "hide" rules: if condition IS met, hide the field
        if (conditionMet) {
          return false;
        }
      }
    }

    return true;
  }, [field.conditionalRules, formValues]);
}

/**
 * Utility function for non-hook contexts
 */
export function evaluateFieldVisibility(
  field: FormBuilderField,
  formValues: Record<string, any>
): boolean {
  const rules = field.conditionalRules || [];
  
  if (rules.length === 0) {
    return true;
  }

  for (const rule of rules) {
    const conditionMet = evaluateRule(rule, formValues);
    
    if (rule.conditionType === 'show' && !conditionMet) {
      return false;
    }
    if (rule.conditionType === 'hide' && conditionMet) {
      return false;
    }
  }

  return true;
}
