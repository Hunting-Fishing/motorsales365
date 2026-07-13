
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TeamMember } from "@/types/team";
import { getInitials } from "@/utils/teamUtils";

interface TeamMembersListProps {
  teamMembers: TeamMember[];
  selectedParticipants: string[];
  onToggleParticipant: (userId: string) => void;
}

export const TeamMembersList: React.FC<TeamMembersListProps> = ({
  teamMembers,
  selectedParticipants,
  onToggleParticipant
}) => {
  if (teamMembers.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {teamMembers.map(member => {
        const isSelected = selectedParticipants.includes(member.id);
        return (
          <li 
            key={member.id}
            className={`flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer ${
              isSelected ? 'bg-muted' : ''
            }`}
            onClick={() => onToggleParticipant(member.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>
            <Button 
              variant={isSelected ? "default" : "outline"} 
              size="sm"
              className={isSelected ? "bg-primary" : ""}
              onClick={(e) => {
                e.stopPropagation();
                onToggleParticipant(member.id);
              }}
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
