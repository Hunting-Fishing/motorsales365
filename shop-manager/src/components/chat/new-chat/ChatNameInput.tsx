
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TeamMember } from '@/types/team';

export interface ChatNameInputProps {
  chatName: string;
  setChatName: (name: string) => void;
  chatType: "direct" | "group";
  participants: string[];
}

export const ChatNameInput: React.FC<ChatNameInputProps> = ({ 
  chatName, 
  setChatName, 
  chatType, 
  participants 
}) => {
  // Generate a default placeholder based on the participants and chat type
  const getDefaultPlaceholder = (): string => {
    if (chatType === "direct" && participants.length === 1) {
      // When used in a component, actual member lookup would happen here
      return "Direct Message";
    } else if (participants.length > 1) {
      return "Group Chat";
    }
    
    return "Enter chat name";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="chat-name">Chat Name</Label>
      <Input
        id="chat-name"
        placeholder={getDefaultPlaceholder()}
        value={chatName}
        onChange={(e) => setChatName(e.target.value)}
      />
    </div>
  );
};
