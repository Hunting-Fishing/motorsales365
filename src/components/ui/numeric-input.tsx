import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Raw digit string (no commas). Empty string means unset. */
  value: string;
  /** Called with digits-only string. */
  onChange: (digits: string) => void;
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  // Keep only digits
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("en-US");
}

/**
 * Number input that renders comma-formatted thousands (2,250,000) while
 * storing the raw digit string. Mobile keypads get inputMode="numeric".
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatDigits(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits);
        }}
        className={cn(className)}
        {...rest}
      />
    );
  },
);
NumericInput.displayName = "NumericInput";

/**
 * Utility: classes to visually indicate whether a mandatory field is filled.
 * Orange ring when empty, green ring when filled.
 */
export function mandatoryFieldClass(filled: boolean): string {
  return filled
    ? "border-emerald-500/70 focus-visible:ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10"
    : "border-orange-400 focus-visible:ring-orange-400/40 bg-orange-50/40 dark:bg-orange-950/10";
}
