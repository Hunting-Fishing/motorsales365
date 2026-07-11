
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface ColorSelectorProps {
  label: string;
  color: string;
  onChange: (value: string) => void;
}

export function ColorSelector({ label, color, onChange }: ColorSelectorProps) {
  const [inputValue, setInputValue] = useState(color);
  const [isValidHex, setIsValidHex] = useState(true);
  
  // Sync input value with color prop
  useEffect(() => {
    setInputValue(color);
    validateHexColor(color);
  }, [color]);

  const validateHexColor = (value: string) => {
    const isValid = /^#([0-9A-F]{3}){1,2}$/i.test(value);
    setIsValidHex(isValid);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (validateHexColor(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValidHex(true);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex space-x-2">
        <div className="relative">
          <div 
            className={`h-10 w-12 rounded-md border transition-all cursor-pointer overflow-hidden relative ${!isValidHex ? 'border-destructive' : ''}`}
            style={{ backgroundColor: isValidHex ? inputValue : '#ffffff' }}
          >
            <input 
              type="color" 
              value={isValidHex ? inputValue : '#ffffff'}
              onChange={handleColorPickerChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label={`Color picker for ${label}`}
            />
            {isValidHex && 
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-all">
                <Check className="text-white opacity-0 hover:opacity-100 transition-opacity" size={16} />
              </div>
            }
          </div>
        </div>
        <Input 
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className={`flex-1 font-mono ${!isValidHex ? 'border-destructive' : ''}`}
        />
      </div>
      {!isValidHex && (
        <p className="text-xs text-destructive mt-1">Please enter a valid hex color (e.g., #FF0000)</p>
      )}
    </div>
  );
}
