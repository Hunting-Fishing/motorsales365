import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Car, Ship, Fuel, Zap, Tractor, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EquipmentType = 'vehicle' | 'boat' | 'fuel_tank' | 'generator' | 'farm_equipment' | 'other';

interface EquipmentTypeOption {
  type: EquipmentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const EQUIPMENT_TYPES: EquipmentTypeOption[] = [
  {
    type: 'vehicle',
    label: 'Vehicle',
    description: 'Car, truck, or van',
    icon: Car,
    color: 'text-blue-500',
  },
  {
    type: 'boat',
    label: 'Boat',
    description: 'Watercraft or marine vessel',
    icon: Ship,
    color: 'text-cyan-500',
  },
  {
    type: 'fuel_tank',
    label: 'Fuel Tank',
    description: 'Storage tank for heating or backup',
    icon: Fuel,
    color: 'text-orange-500',
  },
  {
    type: 'generator',
    label: 'Generator',
    description: 'Backup power generator',
    icon: Zap,
    color: 'text-yellow-500',
  },
  {
    type: 'farm_equipment',
    label: 'Farm Equipment',
    description: 'Tractor, harvester, etc.',
    icon: Tractor,
    color: 'text-green-500',
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other fuel-consuming equipment',
    icon: Package,
    color: 'text-gray-500',
  },
];

interface EquipmentTypeSelectorProps {
  onSelect: (type: EquipmentType) => void;
  disabled?: boolean;
}

export function EquipmentTypeSelector({ onSelect, disabled }: EquipmentTypeSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (type: EquipmentType) => {
    onSelect(type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed hover:border-primary hover:bg-primary/5"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted-foreground px-2 py-1">
            What type of equipment?
          </p>
          {EQUIPMENT_TYPES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => handleSelect(option.type)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left',
                  'hover:bg-accent transition-colors'
                )}
              >
                <div className={cn('p-2 rounded-lg bg-muted', option.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getEquipmentTypeConfig(type: EquipmentType): EquipmentTypeOption {
  return EQUIPMENT_TYPES.find((t) => t.type === type) || EQUIPMENT_TYPES[5]; // Default to 'other'
}
