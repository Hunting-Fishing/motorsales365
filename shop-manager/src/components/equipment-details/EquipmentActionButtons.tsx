
import React from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, Calendar, FileText, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Equipment } from '@/types/equipment';

interface EquipmentActionButtonsProps {
  equipment: Equipment;
  onScheduleMaintenance?: () => void;
  onCreateWorkOrder?: (type: any, priority: any) => void;
}

export const EquipmentActionButtons: React.FC<EquipmentActionButtonsProps> = ({ 
  equipment,
  onScheduleMaintenance,
  onCreateWorkOrder
}) => {
  const navigate = useNavigate();

  const handleCreateWorkOrder = () => {
    if (onCreateWorkOrder) {
      onCreateWorkOrder('maintenance', 'medium');
    } else {
      navigate('/work-orders/create', {
        state: {
          equipmentId: equipment.id,
          customer: equipment.customer,
          location: equipment.location,
          description: `Maintenance for ${equipment.name} (${equipment.model})`
        }
      });
    }
  };

  const handleScheduleMaintenance = () => {
    if (onScheduleMaintenance) {
      onScheduleMaintenance();
    } else {
      navigate('/calendar', {
        state: {
          equipmentId: equipment.id,
          eventType: 'maintenance',
          title: `Maintenance: ${equipment.name}`
        }
      });
    }
  };

  const handleViewReports = () => {
    navigate(`/equipment/${equipment.id}/reports`);
  };

  const handleEditEquipment = () => {
    navigate(`/equipment/${equipment.id}/edit`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleCreateWorkOrder} className="flex items-center gap-2">
        <Wrench className="h-4 w-4" />
        Create Work Order
      </Button>
      
      <Button variant="outline" onClick={handleScheduleMaintenance} className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Schedule Maintenance
      </Button>
      
      <Button variant="outline" onClick={handleViewReports} className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        View Reports
      </Button>
      
      <Button variant="ghost" onClick={handleEditEquipment} className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Edit Equipment
      </Button>
    </div>
  );
};
