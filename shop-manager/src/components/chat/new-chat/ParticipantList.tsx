
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TeamMember } from '@/types/team';

export interface ParticipantListProps {
  participants: string[];
  teamMembers: TeamMember[]; 
  onRemoveParticipant: (userId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ 
  participants, 
  teamMembers,
  onRemoveParticipant 
}) => {
  return (
    <div className="border rounded-md p-2 mt-1 mb-3 max-h-32 overflow-y-auto">
      <div className="flex flex-wrap gap-2">
        {participants.length > 0 ? (
          participants.map(userId => {
            const member = teamMembers.find(m => m.id === userId);
            
            return (
              <div 
                key={userId}
                className="flex items-center bg-gray-100 rounded-full pr-2 pl-1 py-0.5"
              >
                <Avatar className="h-6 w-6 mr-1">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${member?.name || 'User'}&background=random`} />
                  <AvatarFallback>{(member?.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[100px]">{member?.name || 'Unknown User'}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => onRemoveParticipant(userId)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-gray-500 text-sm italic p-1">No participants selected</div>
        )}
      </div>
    </div>
  );
};
