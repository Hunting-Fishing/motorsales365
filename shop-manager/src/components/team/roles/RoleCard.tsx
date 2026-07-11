
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { PermissionSet } from "@/types/permissions";
import { RoleCardHeader } from "./RoleCardHeader";
import { RoleCardBadges } from "./RoleCardBadges";
import { RoleCardPermissions } from "./RoleCardPermissions";

interface RoleCardProps {
  role: {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    permissions: PermissionSet;
    memberCount?: number;
    members?: Array<{
      user_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      job_title: string | null;
      department_name: string | null;
    }>;
  };
  onEdit: (role: any) => void;
  onDelete: (role: any) => void;
  onDuplicate: (role: any) => void;
  onReorder: (roleId: string, direction: 'up' | 'down') => Promise<boolean> | boolean;
  isFirst: boolean;
  isLast: boolean;
}

export function RoleCard({ 
  role, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onReorder,
  isFirst,
  isLast
}: RoleCardProps) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const permissions = role.permissions as PermissionSet;

  // Count total enabled permissions
  const countEnabledPermissions = () => {
    let count = 0;
    
    // Loop through each module
    Object.values(permissions).forEach(moduleActions => {
      // Count enabled actions within each module
      Object.values(moduleActions).forEach(isEnabled => {
        if (isEnabled === true) count++;
      });
    });
    
    return count;
  };

  // Get key permissions to highlight
  const getKeyPermissions = () => {
    return {
      canManageTeam: permissions.team?.edit === true,
      canManageCustomers: permissions.customers?.edit === true,
      canManageWorkOrders: permissions.workOrders?.edit === true,
      canManageInvoices: permissions.invoices?.edit === true,
      canViewReports: permissions.reports?.view === true,
      canAccessSettings: permissions.settings?.view === true,
    };
  };

  const keyPermissions = getKeyPermissions();
  const totalEnabled = countEnabledPermissions();

  return (
    <Card key={role.id} className={`${role.isDefault ? "border-slate-200" : "border-esm-blue-200"} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2">
        <RoleCardHeader 
          role={role}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onReorder={onReorder}
          isFirst={isFirst}
          isLast={isLast}
        />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 mb-3">{role.description}</p>
        
        {/* Member Count */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {role.memberCount || 0} {(role.memberCount || 0) === 1 ? 'member' : 'members'}
          </Badge>
          {(role.memberCount || 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-xs text-slate-600 hover:text-slate-900"
              onClick={() => setShowMembers(!showMembers)}
            >
              {showMembers ? 'Hide' : 'Show'} members
            </Button>
          )}
        </div>

        {/* Members List */}
        {showMembers && role.members && role.members.length > 0 && (
          <div className="mb-3 p-3 bg-slate-50 rounded-md">
            <div className="text-xs font-medium text-slate-700 mb-2">Assigned Members:</div>
            <div className="space-y-2">
              {role.members.map((member) => (
                <div key={member.user_id} className="flex flex-col gap-1 p-2 bg-white rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {[member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unknown User'}
                    </span>
                    {member.department_name && (
                      <Badge variant="outline" className="text-xs">
                        {member.department_name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {member.job_title && (
                      <span>{member.job_title}</span>
                    )}
                    {member.email && (
                      <span className="text-slate-400">• {member.email}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <RoleCardBadges 
          role={role} 
          totalEnabledPermissions={totalEnabled} 
        />
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0 h-auto text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-2"
          onClick={() => setShowPermissions(!showPermissions)}
        >
          {showPermissions ? "Hide permissions" : "Show permissions"}
          {showPermissions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        
        {showPermissions && <RoleCardPermissions keyPermissions={keyPermissions} />}
      </CardContent>
    </Card>
  );
}
