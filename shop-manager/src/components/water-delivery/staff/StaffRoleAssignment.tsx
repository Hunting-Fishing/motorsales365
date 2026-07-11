import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { useWaterDeliveryStaff, useAvailableRoles, WaterDeliveryStaffMember } from '@/hooks/water-delivery/useWaterDeliveryStaff';
import { cn } from '@/lib/utils';

interface StaffRoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: WaterDeliveryStaffMember | null;
}

const roleColors: Record<string, string> = {
  owner: 'border-purple-500 bg-purple-500/10',
  admin: 'border-red-500 bg-red-500/10',
  manager: 'border-blue-500 bg-blue-500/10',
  technician: 'border-green-500 bg-green-500/10',
  reception: 'border-amber-500 bg-amber-500/10',
  service_advisor: 'border-cyan-500 bg-cyan-500/10',
  parts_manager: 'border-orange-500 bg-orange-500/10',
  other_staff: 'border-slate-500 bg-slate-500/10',
};

export function StaffRoleAssignment({
  open,
  onOpenChange,
  staff,
}: StaffRoleAssignmentProps) {
  const { assignRole, isAssigningRole } = useWaterDeliveryStaff();
  const { data: roles = [] } = useAvailableRoles();
  
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Reset selection when staff changes
  React.useEffect(() => {
    if (staff && staff.roles.length > 0) {
      setSelectedRoleId(staff.roles[0].id);
    } else {
      setSelectedRoleId('');
    }
  }, [staff]);

  const handleSubmit = async () => {
    if (!staff || !selectedRoleId) return;
    
    try {
      await assignRole({
        staffId: staff.id,
        roleId: selectedRoleId,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Filter roles suitable for water delivery staff
  const waterDeliveryRoles = roles.filter(role => 
    ['owner', 'admin', 'manager', 'technician', 'reception', 'service_advisor', 'parts_manager', 'other_staff'].includes(role.name)
  );

  if (!staff) return null;

  const currentRole = staff.roles[0]?.name || 'none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-500" />
            Assign Role
          </DialogTitle>
          <DialogDescription>
            Change the role for {staff.first_name} {staff.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Role */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-1">Current Role</p>
            <div className="flex items-center gap-2">
              {staff.roles.length > 0 ? (
                staff.roles.map((role) => (
                  <Badge 
                    key={role.id} 
                    variant="outline"
                    className={cn('capitalize', roleColors[role.name])}
                  >
                    {role.name.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="bg-muted">No role assigned</Badge>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Select New Role</Label>
            <RadioGroup
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              className="space-y-2"
            >
              {waterDeliveryRoles.map((role) => (
                <label
                  key={role.id}
                  htmlFor={role.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedRoleId === role.id
                      ? cn('ring-2 ring-cyan-500', roleColors[role.name])
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <RadioGroupItem value={role.id} id={role.id} className="mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium capitalize">{role.name.replace('_', ' ')}</p>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Warning for sensitive roles */}
          {(selectedRoleId && waterDeliveryRoles.find(r => r.id === selectedRoleId)?.name === 'owner') && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Owner Role Warning</p>
                <p className="text-muted-foreground">
                  Assigning the Owner role grants full access to all settings, billing, and user management.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigningRole}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAssigningRole || !selectedRoleId}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            {isAssigningRole ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
