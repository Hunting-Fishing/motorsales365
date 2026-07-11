
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TeamMember } from '@/types/team';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/utils/teamUtils';

interface ProfileSidebarProps {
  member: TeamMember;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ member }) => {
  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=96`}
            alt={member.name}
          />
          <AvatarFallback className="text-2xl">{getInitials(member.name)}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{member.name}</h2>
        <p className="text-gray-500">{member.jobTitle}</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Role</h3>
          <Badge variant="outline" className="mt-1">
            {member.role}
          </Badge>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Department</h3>
          <p>{member.department}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <Badge 
            variant={member.status === "Active" ? "default" : 
              (member.status === "Inactive" || member.status === "Terminated") ? "destructive" : "secondary"}
            className="mt-1"
          >
            {member.status}
          </Badge>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="text-sm">{member.email}</p>
          </div>
          {member.phone && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Phone</h3>
              <p className="text-sm">{member.phone}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Work Orders</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-md">
            <div className="font-medium">{member.workOrders?.assigned || 0}</div>
            <div className="text-xs text-gray-500">Assigned</div>
          </div>
          <div className="bg-slate-50 p-2 rounded-md">
            <div className="font-medium">{member.workOrders?.completed || 0}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
