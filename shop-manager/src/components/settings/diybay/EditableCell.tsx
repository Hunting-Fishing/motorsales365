
import React, { useState, useRef, useEffect } from "react";
import { TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

export interface EditableCellProps {
  value: number | null;
  onSave: (value: string) => Promise<boolean>;
  isNumber?: boolean;
  formatValue?: (value: number | null) => string;
  disabled?: boolean;
  prefix?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onSave, 
  isNumber = false,
  formatValue = (val) => val?.toString() || "",
  disabled = false,
  prefix = "$"
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setEditValue(value?.toString() || "");
    setIsEditing(true);
    setError(null);
  };

  const validateNumber = (val: string) => {
    if (isNumber) {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }
    return true;
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!validateNumber(editValue)) {
      setError("Please enter a valid number");
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(editValue);
      if (success) {
        setIsEditing(false);
        setError(null);
      } else {
        setError("Failed to save");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <TableCell className="p-2">
        <div className="relative flex items-center">
          {isNumber && <span className="absolute left-3 text-gray-500">{prefix}</span>}
          <Input
            ref={inputRef}
            type={isNumber ? "number" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`px-2 py-1 w-full ${isNumber ? 'pl-6' : ''} ${error ? 'border-red-500' : ''}`}
            disabled={isSaving}
            min={0}
            step="0.01"
          />
          <div className="flex space-x-1 ml-1">
            <button 
              onClick={handleSave}
              className="text-green-600 hover:text-green-800"
              disabled={isSaving}
            >
              <Check className="h-4 w-4" />
            </button>
            <button 
              onClick={handleCancel}
              className="text-red-600 hover:text-red-800"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      </TableCell>
    );
  }

  return (
    <TableCell 
      className="text-right cursor-pointer hover:bg-gray-50" 
      onClick={handleEdit} 
      onDoubleClick={handleEdit} // Adding explicit double-click handler
    >
      {formatValue(value)}
    </TableCell>
  );
};
