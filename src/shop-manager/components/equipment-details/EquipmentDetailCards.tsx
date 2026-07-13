
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Equipment } from "@/types/equipment";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { WarrantyStatusBadge } from "@/components/equipment/WarrantyStatusBadge";
import { maintenanceFrequencyMap } from "@/data/equipmentData";

interface EquipmentDetailCardsProps {
  equipmentItem: Equipment;
}

export function EquipmentDetailCards({ equipmentItem }: EquipmentDetailCardsProps) {
  const isMaintenanceOverdue = equipmentItem.next_maintenance_date && new Date(equipmentItem.next_maintenance_date) < new Date();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Manufacturer:</dt>
              <dd>{equipmentItem.manufacturer}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Serial Number:</dt>
              <dd>{equipmentItem.serial_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Category:</dt>
              <dd>{equipmentItem.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Status:</dt>
              <dd><EquipmentStatusBadge status={equipmentItem.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Customer:</dt>
              <dd>{equipmentItem.customer}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Location:</dt>
              <dd>{equipmentItem.location}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates & Warranty</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Purchase Date:</dt>
              <dd>{equipmentItem.purchase_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Install Date:</dt>
              <dd>{equipmentItem.install_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Last Maintenance:</dt>
              <dd>{equipmentItem.last_maintenance_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Next Maintenance:</dt>
              <dd className={isMaintenanceOverdue ? "text-red-600 font-medium" : ""}>
                {equipmentItem.next_maintenance_date}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Maintenance Frequency:</dt>
              <dd>{maintenanceFrequencyMap[equipmentItem.maintenance_frequency] || equipmentItem.maintenance_frequency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Warranty Expiry:</dt>
              <dd>{equipmentItem.warranty_expiry_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Warranty Status:</dt>
              <dd><WarrantyStatusBadge status={equipmentItem.warranty_status} /></dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
