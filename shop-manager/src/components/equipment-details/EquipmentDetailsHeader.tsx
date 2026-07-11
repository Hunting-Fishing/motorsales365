
import { Button } from "@/components/ui/button";
import { Equipment } from "@/types/equipment";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EquipmentActionButtons } from "./EquipmentActionButtons";

interface EquipmentDetailsHeaderProps {
  equipmentItem: Equipment;
  isMaintenanceOverdue: boolean;
}

export function EquipmentDetailsHeader({ equipmentItem, isMaintenanceOverdue }: EquipmentDetailsHeaderProps) {
  const navigate = useNavigate();
  
  return (
    <div>
      <Button variant="ghost" onClick={() => navigate("/equipment")} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Equipment
      </Button>
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{equipmentItem.name}</h1>
          <p className="text-slate-500">{equipmentItem.id} | {equipmentItem.model}</p>
        </div>
        <EquipmentActionButtons 
          equipment={equipmentItem}
          onScheduleMaintenance={() => console.log('Schedule maintenance for', equipmentItem.id)}
          onCreateWorkOrder={(type, priority) => console.log('Create work order', type, priority, 'for', equipmentItem.id)}
        />
      </div>
    </div>
  );
}
