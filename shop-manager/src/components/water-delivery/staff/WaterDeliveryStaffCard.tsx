import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Mail, 
  Phone, 
  Edit, 
  Send, 
  UserX,
  Shield
} from 'lucide-react';
import { WaterDeliveryStaffMember } from '@/hooks/water-delivery/useWaterDeliveryStaff';
import { useCanManageStaff } from './StaffManagementGuard';
import { cn } from '@/lib/utils';

interface WaterDeliveryStaffCardProps {
  staff: WaterDeliveryStaffMember;
  onEdit: (staff: WaterDeliveryStaffMember) => void;
  onAssignRole: (staff: WaterDeliveryStaffMember) => void;
  onResendInvite: (staff: WaterDeliveryStaffMember) => void;
  onDeactivate: (staff: WaterDeliveryStaffMember) => void;
  onReactivate: (staff: WaterDeliveryStaffMember) => void;
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  dispatch: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  truck_driver: 'bg-green-500/10 text-green-500 border-green-500/20',
  operations_manager: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  yard_manager: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  other_staff: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function formatRoleName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function WaterDeliveryStaffCard({
  staff,
  onEdit,
  onAssignRole,
  onResendInvite,
  onDeactivate,
}: WaterDeliveryStaffCardProps) {
  const { canManage, canDeactivate } = useCanManageStaff();
  const fullName = `${staff.first_name} ${staff.last_name}`;
  const initials = getInitials(staff.first_name, staff.last_name);

  // Determine status based on is_active and roles
  const hasNoRoles = staff.roles.length === 0;

  const getStatusBadge = () => {
    if (!staff.is_active) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          Inactive
        </Badge>
      );
    }
    if (hasNoRoles) {
      return (
        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20">
          No Role
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
        Active
      </Badge>
    );
  };

  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-200 border-border/50',
      hasNoRoles && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground truncate">{fullName}</h4>
                {staff.job_title && (
                  <p className="text-sm text-muted-foreground">{staff.job_title}</p>
                )}
              </div>
              
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(staff)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssignRole(staff)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Assign Role
                    </DropdownMenuItem>
                    {!staff.profile_id && (
                      <DropdownMenuItem onClick={() => onResendInvite(staff)}>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invite
                      </DropdownMenuItem>
                    )}
                    {canDeactivate && staff.roles.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeactivate(staff)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Remove Roles
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Contact Info */}
            <div className="mt-2 space-y-1">
              {staff.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{staff.email}</span>
                </div>
              )}
              {staff.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{staff.phone}</span>
                </div>
              )}
            </div>

            {/* Roles & Status */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              {staff.roles.map((role) => (
                <Badge 
                  key={role.id} 
                  variant="outline" 
                  className={cn('text-xs', roleColors[role.name] || roleColors.other_staff)}
                >
                  {formatRoleName(role.name)}
                </Badge>
              ))}
              {staff.department && (
                <Badge variant="secondary" className="text-xs">
                  {staff.department}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
