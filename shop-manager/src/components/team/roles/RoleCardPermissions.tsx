
import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { PermissionSet } from "@/types/permissions";

interface RoleCardPermissionsProps {
  keyPermissions: {
    canManageTeam: boolean;
    canManageCustomers: boolean;
    canManageWorkOrders: boolean;
    canManageInvoices: boolean;
    canViewReports: boolean;
    canAccessSettings: boolean;
  };
}

export function RoleCardPermissions({ keyPermissions }: RoleCardPermissionsProps) {
  return (
    <div className="mt-2 bg-slate-50 p-2 rounded-md space-y-1.5">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {keyPermissions.canManageTeam ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>Manage Team</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {keyPermissions.canManageWorkOrders ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>Manage Work Orders</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {keyPermissions.canManageCustomers ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>Manage Customers</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {keyPermissions.canManageInvoices ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>Manage Invoices</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {keyPermissions.canViewReports ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>View Reports</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {keyPermissions.canAccessSettings ? 
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : 
            <XCircle className="h-3.5 w-3.5 text-slate-300" />}
          <span>Access Settings</span>
        </div>
      </div>
    </div>
  );
}
