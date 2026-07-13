
// Fix for the export menu to handle WorkOrder type properly
import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import { Button } from '@/components/ui/button';
import { WorkOrder } from '@/types/workOrder';
import { format } from 'date-fns';

export function generateCSV(data: WorkOrder[]) {
  const simplifiedData = data.map(order => ({
    "ID": order.id,
    "Customer": order.customer,
    "Status": order.status,
    "Priority": order.priority,
    "Created Date": order.created_at ? format(new Date(order.created_at), 'yyyy-MM-dd') : '',
    "Due Date": order.due_date,
    "Description": order.description,
    "Service Type": order.service_type,
    "Location": order.location,
    "Notes": order.notes,
    "Total Billable Time": order.total_billable_time,
    "Technician": order.technician,
  }));
  
  return XLSXUtils.json_to_sheet(simplifiedData);
}

export function downloadExcel(data: WorkOrder[], fileName: string) {
  const worksheet = generateCSV(data);
  const workbook = XLSXUtils.book_new();
  XLSXUtils.book_append_sheet(workbook, worksheet, 'Work Orders');
  
  const excelBuffer = XLSXWrite(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(dataBlob, fileName);
}

// Main export dropdown menu
export function WorkOrdersExportMenu({ workOrders }: { workOrders: WorkOrder[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleExportCSV = () => {
    downloadExcel(workOrders, 'work-orders.xlsx');
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
      >
        Export
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-10 border">
          <div className="py-1">
            <button
              onClick={handleExportCSV}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export to Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
