
import React, { useState } from 'react';
import { Label } from "@/components/ui/label";

interface InspectionItemProps {
  label: string;
  options: string[];
  icon?: React.ReactNode;
}

const InspectionItem: React.FC<InspectionItemProps> = ({ 
  label, 
  options,
  icon
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted/30 px-3 py-2 flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center">
          {icon && <span className="mr-1.5">{icon}</span>}
          {label}
        </Label>
        {selectedOption && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            selectedOption.toLowerCase().includes('good') || 
            selectedOption.toLowerCase() === 'working' || 
            selectedOption.toLowerCase() === 'clean' ||
            selectedOption.toLowerCase().includes('full') || 
            selectedOption === 'Normal' ||
            selectedOption === 'Clear' ||
            selectedOption === 'No Odor' ||
            selectedOption === 'Balanced' ||
            selectedOption === 'Aligned' ||
            selectedOption === 'Over 50%'
              ? 'bg-green-100 text-green-800'
              : selectedOption.toLowerCase().includes('fair') ||
                selectedOption.toLowerCase().includes('mild') ||
                selectedOption.toLowerCase() === 'low' ||
                selectedOption.toLowerCase().includes('30-50%') ||
                selectedOption.toLowerCase() === 'dim' ||
                selectedOption.toLowerCase() === 'dirty' ||
                selectedOption.toLowerCase() === 'rough' ||
                selectedOption.toLowerCase() === 'light noise' ||
                selectedOption.toLowerCase().includes('stained')
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-red-100 text-red-800'
          }`}>
            {selectedOption}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelectedOption(option)}
            className={`text-xs px-2 py-1.5 rounded border transition-colors ${
              selectedOption === option 
                ? 'bg-primary/10 border-primary/30 text-primary font-medium' 
                : 'bg-background hover:bg-muted/30 border-muted-foreground/20'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InspectionItem;
