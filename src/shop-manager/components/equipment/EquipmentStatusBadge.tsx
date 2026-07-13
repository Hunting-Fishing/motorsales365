
import { equipmentStatusMap } from "@sm/data/equipmentData";
import { Equipment } from "@sm/types/equipment";

interface EquipmentStatusBadgeProps {
  status: Equipment["status"];
}

export function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  const { label, classes } = equipmentStatusMap[status];
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${classes}`}>
      {label}
    </span>
  );
}
