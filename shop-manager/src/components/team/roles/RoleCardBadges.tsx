
import React from "react";
import { Badge } from "@/components/ui/badge";


interface RoleCardBadgesProps {
  role: any;
  totalEnabledPermissions: number;
}

export function RoleCardBadges({ role, totalEnabledPermissions }: RoleCardBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {role.isDefault ? (
        <Badge variant="outline" className="bg-slate-100 text-slate-700">
          Default Role
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-esm-blue-50 text-esm-blue-700">
          Custom Role
        </Badge>
      )}
      
      <Badge variant="outline" className="bg-slate-50">
        {totalEnabledPermissions} Permissions
      </Badge>
      
      <Badge variant="outline" className="bg-slate-50">
        Priority: {role.priority}
      </Badge>
    </div>
  );
}
