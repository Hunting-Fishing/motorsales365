
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface InventoryFormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  description?: string;
  as?: string;
  disabled?: boolean;
  className?: string; // Added className property
}

export function InventoryFormField({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder = "",
  type = "text",
  min,
  max,
  step,
  description,
  as,
  disabled = false,
  className = ""
}: InventoryFormFieldProps) {
  const renderField = () => {
    if (as === "textarea") {
      return <Textarea 
        id={name} 
        name={name} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        className={error ? "border-red-500" : ""} 
        rows={4} 
        disabled={disabled} 
      />;
    }
    return <Input 
      id={name} 
      name={name} 
      type={type} 
      value={value} 
      onChange={onChange} 
      min={min} 
      max={max} 
      step={step} 
      placeholder={placeholder} 
      className={error ? "border-red-500" : ""} 
      disabled={disabled} 
    />;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between">
        <label htmlFor={name} className="block text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
      {renderField()}
      {description && <p className="text-slate-500 text-lg">{description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
