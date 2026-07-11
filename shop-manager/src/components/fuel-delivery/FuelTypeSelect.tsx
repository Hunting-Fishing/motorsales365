import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

export const FUEL_TYPE_OPTIONS = [
  { value: 'gasoline_87', label: 'Gasoline 87 (Regular)', group: 'gasoline' },
  { value: 'gasoline_89', label: 'Gasoline 89 (Mid-Grade)', group: 'gasoline' },
  { value: 'gasoline_91', label: 'Gasoline 91 (Premium)', group: 'gasoline' },
  { value: 'gasoline_94', label: 'Gasoline 94 (Ultra Premium)', group: 'gasoline' },
  { value: 'diesel', label: 'Diesel', group: 'diesel' },
  { value: 'diesel_def', label: 'Diesel DEF', group: 'diesel' },
  { value: 'heating_oil', label: 'Heating Oil', group: 'other' },
  { value: 'propane', label: 'Propane', group: 'other' },
  { value: 'kerosene', label: 'Kerosene', group: 'other' },
  { value: 'bio_diesel', label: 'Bio-Diesel', group: 'diesel' },
];

interface FuelTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const FuelTypeSelect: React.FC<FuelTypeSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select fuel type',
}) => {
  const gasolineOptions = FUEL_TYPE_OPTIONS.filter(o => o.group === 'gasoline');
  const dieselOptions = FUEL_TYPE_OPTIONS.filter(o => o.group === 'diesel');
  const otherOptions = FUEL_TYPE_OPTIONS.filter(o => o.group === 'other');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-orange-600">Gasoline</SelectLabel>
          {gasolineOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-blue-600">Diesel</SelectLabel>
          {dieselOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-green-600">Other</SelectLabel>
          {otherOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export const getFuelTypeLabel = (value: string): string => {
  const option = FUEL_TYPE_OPTIONS.find(o => o.value === value);
  return option?.label || value;
};
