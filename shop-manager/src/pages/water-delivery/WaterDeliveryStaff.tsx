import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Loader2,
  UserCheck,
  Clock,
  UserX
} from 'lucide-react';
import { useWaterDeliveryStaff, WaterDeliveryStaffMember } from '@/hooks/water-delivery/useWaterDeliveryStaff';
import { StaffManagementGuard, useCanManageStaff } from '@/components/water-delivery/staff/StaffManagementGuard';
import { WaterDeliveryStaffCard } from '@/components/water-delivery/staff/WaterDeliveryStaffCard';
import { AddWaterDeliveryStaffDialog } from '@/components/water-delivery/staff/AddWaterDeliveryStaffDialog';
import { EditWaterDeliveryStaffDialog } from '@/components/water-delivery/staff/EditWaterDeliveryStaffDialog';
import { StaffRoleAssignment } from '@/components/water-delivery/staff/StaffRoleAssignment';

export default function WaterDeliveryStaff() {
  const { staff, isLoading, resendInvitation, deactivateStaff, reactivateStaff } = useWaterDeliveryStaff();
  const { canManage } = useCanManageStaff();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<WaterDeliveryStaffMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<WaterDeliveryStaffMember | null>(null);

  // Stats - use roles and is_active to determine status
  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter(s => s.is_active && s.roles.length > 0).length;
    const inactive = staff.filter(s => !s.is_active).length;
    const noRole = staff.filter(s => s.is_active && s.roles.length === 0).length;
    return { total, active, inactive, noRole };
  }, [staff]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.job_title?.toLowerCase().includes(searchLower);

      // Role filter
      const matchesRole = roleFilter === 'all' || 
        member.roles.some(r => r.name === roleFilter);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = member.is_active && member.roles.length > 0;
      } else if (statusFilter === 'inactive') {
        matchesStatus = !member.is_active;
      } else if (statusFilter === 'no_role') {
        matchesStatus = member.is_active && member.roles.length === 0;
      }

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, searchQuery, roleFilter, statusFilter]);

  // Handlers
  const handleEdit = (member: WaterDeliveryStaffMember) => {
    setSelectedStaff(member);
    setEditDialogOpen(true);
  };

  const handleAssignRole = (member: WaterDeliveryStaffMember) => {
    setSelectedStaff(member);
    setRoleDialogOpen(true);
  };

  const handleResendInvite = async (member: WaterDeliveryStaffMember) => {
    await resendInvitation(member);
  };

  const handleDeactivate = (member: WaterDeliveryStaffMember) => {
    setConfirmDeactivate(member);
  };

  const handleReactivate = async (member: WaterDeliveryStaffMember) => {
    await reactivateStaff(member.id);
  };

  const confirmDeactivation = async () => {
    if (confirmDeactivate) {
      await deactivateStaff(confirmDeactivate.id);
      setConfirmDeactivate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-cyan-500" />
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your water delivery team members and their roles
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-slate-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/20">
                <Users className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-rose-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <UserX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.noRole}</p>
                <p className="text-xs text-muted-foreground">No Role</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="other_staff">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="no_role">No Role</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <StaffManagementGuard>
        {filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Staff Found</h3>
                <p className="text-muted-foreground mt-1">
                  {staff.length === 0 
                    ? 'Get started by adding your first staff member'
                    : 'Try adjusting your search or filters'
                  }
                </p>
                {canManage && staff.length === 0 && (
                  <Button 
                    onClick={() => setAddDialogOpen(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Your First Staff Member
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <WaterDeliveryStaffCard
                key={member.id}
                staff={member}
                onEdit={handleEdit}
                onAssignRole={handleAssignRole}
                onResendInvite={handleResendInvite}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            ))}
          </div>
        )}
      </StaffManagementGuard>

      {/* Dialogs */}
      <AddWaterDeliveryStaffDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <EditWaterDeliveryStaffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        staff={selectedStaff}
      />

      <StaffRoleAssignment
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        staff={selectedStaff}
      />

      {/* Confirm Deactivation Dialog */}
      <AlertDialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Roles?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all roles from {confirmDeactivate?.first_name} {confirmDeactivate?.last_name}? 
              They will no longer have access to restricted features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Roles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
