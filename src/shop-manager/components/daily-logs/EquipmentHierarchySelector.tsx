import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEquipmentHierarchy, EquipmentNode } from '@/hooks/useEquipmentHierarchy';
import { Loader2, Ship, Cog } from 'lucide-react';

interface EquipmentHierarchySelectorProps {
  selectedParentId: string;
  selectedEquipmentId: string;
  onParentChange: (parentId: string) => void;
  onEquipmentChange: (equipmentId: string, equipment: EquipmentNode | null) => void;
  showChildSelector?: boolean;
}

export function EquipmentHierarchySelector({
  selectedParentId,
  selectedEquipmentId,
  onParentChange,
  onEquipmentChange,
  showChildSelector = true
}: EquipmentHierarchySelectorProps) {
  const { parentEquipment, getChildEquipment, allEquipment, isLoading } = useEquipmentHierarchy();

  const childEquipment = selectedParentId ? getChildEquipment(selectedParentId) : [];
  const hasChildren = childEquipment.length > 0;

  const handleParentChange = (parentId: string) => {
    onParentChange(parentId);
    // If parent has no children, select the parent itself
    const children = getChildEquipment(parentId);
    if (children.length === 0) {
      const parent = allEquipment.find(e => e.id === parentId);
      onEquipmentChange(parentId, parent || null);
    } else {
      onEquipmentChange('', null);
    }
  };

  const handleChildChange = (childId: string) => {
    const equipment = allEquipment.find(e => e.id === childId);
    onEquipmentChange(childId, equipment || null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parent/Vessel Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Ship className="h-4 w-4" />
          Vessel / Main Equipment
        </Label>
        <Select value={selectedParentId} onValueChange={handleParentChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select vessel or equipment" />
          </SelectTrigger>
          <SelectContent>
            {parentEquipment.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.asset_number ? `${item.asset_number} - ` : ''}{item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Child Equipment Selection - only show if parent has children */}
      {showChildSelector && selectedParentId && hasChildren && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Component / Engine
          </Label>
          <Select value={selectedEquipmentId} onValueChange={handleChildChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select component" />
            </SelectTrigger>
            <SelectContent>
              {childEquipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                  {item.equipment_type && ` (${item.equipment_type})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Info text when parent has no children */}
      {selectedParentId && !hasChildren && (
        <p className="text-sm text-muted-foreground">
          This equipment has no sub-components. Logging directly to main equipment.
        </p>
      )}
    </div>
  );
}
