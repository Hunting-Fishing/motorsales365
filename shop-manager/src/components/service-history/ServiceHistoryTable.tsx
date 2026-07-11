
import { Link } from "react-router-dom";
import { CalendarIcon, Clock, Wrench } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/utils/dateUtils";
import { WorkOrder } from "@/types/workOrder";

interface ServiceHistoryTableProps {
  workOrders: WorkOrder[];
  showCustomer?: boolean;
  showEquipment?: boolean;
}

export function ServiceHistoryTable({
  workOrders,
  showCustomer = false,
  showEquipment = false,
}: ServiceHistoryTableProps) {
  if (workOrders.length === 0) {
    return (
      <div className="text-center py-6 bg-slate-50 rounded-md">
        <Wrench className="h-10 w-10 text-slate-300 mx-auto" />
        <p className="mt-2 text-slate-500">No service history available</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Work Order</TableHead>
            <TableHead>Description</TableHead>
            {showCustomer && <TableHead>Customer</TableHead>}
            {showEquipment && <TableHead>Equipment</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.description}</TableCell>
              {showCustomer && <TableCell>{order.customer}</TableCell>}
              {showEquipment && <TableCell>-</TableCell>}
              <TableCell>
                <div className="flex items-center text-sm text-slate-500">
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  {formatDate(order.date)}
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  order.status === "completed" ? "bg-green-100 text-green-800" : 
                  order.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                  order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {order.status === "in-progress" ? "In Progress" : 
                    order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </TableCell>
              <TableCell>{order.technician}</TableCell>
              <TableCell className="text-right">
                <Link 
                  to={`/work-orders/${order.id}`} 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Details
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
