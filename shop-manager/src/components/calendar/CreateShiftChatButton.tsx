
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, CalendarIcon } from 'lucide-react';

interface CreateShiftChatButtonProps {
  onClick: () => void;
}

export const CreateShiftChatButton: React.FC<CreateShiftChatButtonProps> = ({
  onClick
}) => {
  return (
    <Button 
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      <span>Create Shift Chat</span>
    </Button>
  );
};
