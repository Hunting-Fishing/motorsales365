
import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RequiredIndicator } from "@/components/ui/required-indicator"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  required?: boolean;
  fullWidth?: boolean;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
}

export function FormField({
  label,
  description,
  required = false,
  fullWidth = false,
  error,
  containerClassName,
  labelClassName,
  inputClassName,
  descriptionClassName,
  errorClassName,
  className,
  id,
  ...props
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      "flex flex-col space-y-2",
      fullWidth ? "w-full" : "w-full md:w-auto",
      containerClassName
    )}>
      <Label 
        htmlFor={fieldId}
        className={cn("flex items-center", labelClassName)}
      >
        {label}
        {required && <RequiredIndicator />}
      </Label>
      
      <Input
        id={fieldId}
        className={cn(
          "transition-all duration-200 focus:ring-2 focus:ring-offset-0 focus:ring-primary/20",
          error && "border-destructive",
          inputClassName
        )}
        {...props}
      />
      
      {description && (
        <p className={cn(
          "text-xs text-muted-foreground",
          descriptionClassName
        )}>
          {description}
        </p>
      )}
      
      {error && (
        <p className={cn(
          "text-xs font-medium text-destructive",
          errorClassName
        )}>
          {error}
        </p>
      )}
    </div>
  );
}

// Remove the duplicate RequiredIndicator function here
