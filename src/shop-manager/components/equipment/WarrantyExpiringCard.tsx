
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";

interface WarrantyExpiringCardProps {
  equipment: EquipmentWithMaintenance[];
}

export function WarrantyExpiringCard({ equipment }: WarrantyExpiringCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> Warranties Expiring Soon
        </CardTitle>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <p className="text-sm text-slate-500">No warranties expiring within 60 days.</p>
        ) : (
          <div className="space-y-2">
            {equipment.map((item) => (
              <div key={item.id} className="border-b pb-2 last:border-0">
                <Link to={`/equipment/${item.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  {item.name}
                </Link>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">{item.customer}</span>
                  <span className="text-xs font-medium text-red-600">Expires: {item.warranty_expiry_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
