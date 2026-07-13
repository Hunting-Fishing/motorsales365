
import React from 'react';
import { Label } from '@sm/components/ui/label';
import { cn } from '@sm/lib/utils';

interface BaseFormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function BaseFormField({
  label,
  error,
  required,
  className,
  children,
  htmlFor
}: BaseFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
