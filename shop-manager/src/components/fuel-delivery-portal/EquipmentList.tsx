import React from 'react';
import { EquipmentTypeSelector, EquipmentType } from './EquipmentTypeSelector';
import { EquipmentCard, EquipmentData } from './EquipmentCard';
import { Package } from 'lucide-react';

interface EquipmentListProps {
  equipment: EquipmentData[];
  onChange: (equipment: EquipmentData[]) => void;
  disabled?: boolean;
}

export function EquipmentList({ equipment, onChange, disabled }: EquipmentListProps) {
  const addEquipment = (type: EquipmentType) => {
    const newEquipment: EquipmentData = {
      id: crypto.randomUUID(),
      equipment_type: type,
    };
    onChange([...equipment, newEquipment]);
  };

  const updateEquipment = (id: string, updated: EquipmentData) => {
    onChange(equipment.map((e) => (e.id === id ? updated : e)));
  };

  const removeEquipment = (id: string) => {
    onChange(equipment.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-3">
      {equipment.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-lg p-6 text-center">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No equipment added yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Add vehicles, boats, tanks, or generators that need fuel delivery
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.map((item, index) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onChange={(updated) => updateEquipment(item.id, updated)}
              onRemove={() => removeEquipment(item.id)}
              isFirst={index === 0}
            />
          ))}
        </div>
      )}

      <EquipmentTypeSelector onSelect={addEquipment} disabled={disabled} />
    </div>
  );
}
