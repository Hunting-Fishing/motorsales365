
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { AddStaffMemberDialog } from '@/components/staff/AddStaffMemberDialog';
import { StaffMembersList } from '@/components/staff/StaffMembersList';

export default function StaffMembers() {
  const { staff, stats, isLoading, fetchStaff, removeStaffMember } = useStaffManagement();
  
  const handleStaffAdded = () => {
    fetchStaff();
  };
  
  const handleRemoveStaff = async (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      await removeStaffMember(id);
    }
  };

  return (
    <>
      <Helmet>
        <title>Staff Members | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <UserCog className="mr-3 h-8 w-8" />
              Staff Members
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your team members, roles, and permissions
            </p>
          </div>
          <AddStaffMemberDialog onStaffAdded={handleStaffAdded} />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalStaff}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.activeToday}</div>
              <p className="text-xs text-muted-foreground">
                Currently working
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.onLeave}</div>
              <p className="text-xs text-muted-foreground">
                Staff members away
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.pendingReviews}</div>
              <p className="text-xs text-muted-foreground">
                Performance reviews due
              </p>
            </CardContent>
          </Card>
        </div>
        
        <StaffMembersList 
          staff={staff} 
          isLoading={isLoading}
          onRemove={handleRemoveStaff}
        />
      </div>
    </>
  );
}
