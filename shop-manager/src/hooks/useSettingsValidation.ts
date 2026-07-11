
import { useState, useCallback } from 'react';

interface ValidationRule<T> {
  field: keyof T;
  validate: (value: any) => string | null;
}

interface UseSettingsValidationOptions<T> {
  rules: ValidationRule<T>[];
  onValidationChange?: (isValid: boolean) => void;
}

export function useSettingsValidation<T extends Record<string, any>>(
  options: UseSettingsValidationOptions<T>
) {
  const { rules, onValidationChange } = options;
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validateField = useCallback((field: keyof T, value: any): string | null => {
    const rule = rules.find(r => r.field === field);
    return rule ? rule.validate(value) : null;
  }, [rules]);

  const validateAllFields = useCallback((data: T): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    rules.forEach(rule => {
      const error = rule.validate(data[rule.field]);
      if (error) {
        newErrors[rule.field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    onValidationChange?.(isValid);
    return isValid;
  }, [rules, onValidationChange]);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateAllFields,
    clearFieldError,
    clearAllErrors
  };
}
