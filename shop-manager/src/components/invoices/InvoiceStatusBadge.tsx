
import React from "react";

interface InvoiceStatusBadgeProps {
  status: string;
}

// Map of status to text and styles
const statusMap = {
  "paid": { label: "Paid", classes: "bg-green-100 text-green-800" },
  "pending": { label: "Pending", classes: "bg-yellow-100 text-yellow-800" },
  "overdue": { label: "Overdue", classes: "bg-red-100 text-red-800" },
  "draft": { label: "Draft", classes: "bg-slate-100 text-slate-800" },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const statusConfig = statusMap[status as keyof typeof statusMap] || { 
    label: status.charAt(0).toUpperCase() + status.slice(1), 
    classes: "bg-slate-100 text-slate-800" 
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.classes}`}>
      {statusConfig.label}
    </span>
  );
}
