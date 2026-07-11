
import { useState, useCallback } from "react";
import { ControllerRenderProps } from "react-hook-form";

export const useMaskedInput = () => {
  const [isFocused, setIsFocused] = useState(false);

  // Format phone number as (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string): string => {
    if (!value) return "";
    
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Apply formatting based on length
    if (digits.length <= 3) {
      return `(${digits}`;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  // Get props for phone input
  const getPhoneInputProps = (field: ControllerRenderProps<any, any>) => {
    return {
      ...field,
      value: formatPhoneNumber(field.value || ""),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        field.onChange(formatted);
      },
      onFocus: () => setIsFocused(true),
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        field.onBlur();
      },
      maxLength: 14, // (XXX) XXX-XXXX = 14 characters
    };
  };

  return { getPhoneInputProps };
};
