
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type RotorStatus = 'good' | 'warped' | 'scored' | 'replace';

interface RotorConditionProps {
  title: string;
  value: RotorStatus;
  onChange: (value: RotorStatus) => void;
  id: string;
}

export const RotorCondition: React.FC<RotorConditionProps> = ({ 
  title, 
  value, 
  onChange,
  id 
}) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium border-b pb-2">{title}</h4>
      <RadioGroup 
        value={value}
        onValueChange={(value) => onChange(value as RotorStatus)}
        className="flex flex-col space-y-3"
      >
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <RadioGroupItem value="good" id={`${id}-good`} />
          <Label htmlFor={`${id}-good`} className="flex-1 cursor-pointer">Good Condition</Label>
          <span className="text-green-500">✓</span>
        </div>
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <RadioGroupItem value="warped" id={`${id}-warped`} />
          <Label htmlFor={`${id}-warped`} className="flex-1 cursor-pointer">Warped</Label>
          <span className="text-amber-500">!</span>
        </div>
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <RadioGroupItem value="scored" id={`${id}-scored`} />
          <Label htmlFor={`${id}-scored`} className="flex-1 cursor-pointer">Scored</Label>
          <span className="text-amber-500">!</span>
        </div>
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <RadioGroupItem value="replace" id={`${id}-replace`} />
          <Label htmlFor={`${id}-replace`} className="flex-1 cursor-pointer">Needs Replacement</Label>
          <span className="text-red-500">✗</span>
        </div>
      </RadioGroup>
    </div>
  );
};
