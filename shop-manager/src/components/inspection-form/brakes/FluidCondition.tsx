
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FluidConditionProps {
  title: string;
  options: Array<{
    value: string;
    label: string;
    status: 'success' | 'warning' | 'error';
  }>;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

export const FluidCondition: React.FC<FluidConditionProps> = ({
  title,
  options,
  value,
  onChange,
  id
}) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium border-b pb-2">{title}</h4>
      <RadioGroup 
        value={value}
        onValueChange={onChange}
        className="flex flex-col space-y-3"
      >
        {options.map(option => (
          <div key={option.value} className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            <Label htmlFor={`${id}-${option.value}`} className="flex-1 cursor-pointer">{option.label}</Label>
            <span className={option.status === 'success' ? 'text-green-500' : 
                           option.status === 'warning' ? 'text-amber-500' : 
                           'text-red-500'}>
              {option.status === 'success' ? '✓' : 
               option.status === 'warning' ? '!' : 
               '✗'}
            </span>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
