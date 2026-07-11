
import { Link } from "react-router-dom";
import { EquipmentStatusBadge } from "./EquipmentStatusBadge";
import { WarrantyStatusBadge } from "./WarrantyStatusBadge";
import { CogIcon, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import type { EquipmentStatus } from "@/types/equipment";

interface EquipmentTableProps {
  equipment: EquipmentWithMaintenance[];
  loading?: boolean;
}

export function EquipmentTable({ equipment, loading = false }: EquipmentTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-slate-300 animate-spin" />
          <p className="mt-4 text-slate-500">Loading equipment data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-slate-200">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">ID</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Name</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Next Maintenance</TableHead>
            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">Warranty Status</TableHead>
            <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipment.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                <div className="flex flex-col items-center justify-center py-6">
                  <CogIcon className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No equipment found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            equipment.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-slate-900">
                  {item.id}
                </TableCell>
                <TableCell className="text-slate-700">
                  {item.name}
                </TableCell>
                <TableCell className="text-slate-700">
                  {item.customer}
                </TableCell>
                <TableCell className="text-slate-700">
                  {item.category}
                </TableCell>
                <TableCell>
                  <EquipmentStatusBadge status={item.status as EquipmentStatus} />
                </TableCell>
                <TableCell className="text-slate-700">
                  {item.next_maintenance_date || 'Not scheduled'}
                </TableCell>
                <TableCell>
                  <WarrantyStatusBadge status={item.warranty_status} />
                </TableCell>
                <TableCell className="text-right">
                  <Link to={`/equipment/${item.id}`} className="text-blue-600 hover:text-blue-800 mr-4">
                    View
                  </Link>
                  <Link to={`/equipment/${item.id}/edit`} className="text-blue-600 hover:text-blue-800">
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
