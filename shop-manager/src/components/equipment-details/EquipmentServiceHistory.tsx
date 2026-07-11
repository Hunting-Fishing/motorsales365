
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, History } from "lucide-react";
import { ServiceHistoryTable } from "@/components/service-history/ServiceHistoryTable";
import { WorkOrder } from "@/types/workOrder";

interface EquipmentServiceHistoryProps {
  equipmentId: string;
  workOrders: WorkOrder[];
}

export function EquipmentServiceHistory({ equipmentId, workOrders }: EquipmentServiceHistoryProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
        <div className="flex items-center">
          <History className="h-5 w-5 mr-2 text-slate-500" />
          <CardTitle className="text-lg">Service History</CardTitle>
        </div>
        <Link to={`/work-orders/new?equipment=${equipmentId}`}>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Create Work Order
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ServiceHistoryTable workOrders={workOrders} />
      </CardContent>
    </Card>
  );
}
