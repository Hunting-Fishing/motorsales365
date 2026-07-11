import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StaffMember } from '@/hooks/useStaffManagement';

interface StaffMembersListProps {
  staff: StaffMember[];
  isLoading: boolean;
  onEdit?: (member: StaffMember) => void;
  onRemove?: (id: string) => void;
}

export function StaffMembersList({ staff, isLoading, onEdit, onRemove }: StaffMembersListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No staff members found. Add your first team member to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'technician': 'Technician',
      'service_advisor': 'Service Advisor',
      'manager': 'Manager',
      'reception': 'Reception',
      'admin': 'Administrator',
      'owner': 'Owner',
      'other': 'Other'
    };
    return roleMap[role] || role;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members ({staff.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {staff.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(member.first_name, member.last_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold">
                      {member.first_name} {member.last_name}
                    </h4>
                    {member.job_title && (
                      <Badge variant="secondary">
                        {getRoleDisplayName(member.job_title)}
                      </Badge>
                    )}
                    {member.department && (
                      <Badge variant="outline">
                        {member.department}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                    {member.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {member.roles && member.roles.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {member.roles.map((role) => (
                        <Badge key={role.id} variant="outline" className="text-xs">
                          {getRoleDisplayName(role.name)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(member)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onRemove?.(member.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}