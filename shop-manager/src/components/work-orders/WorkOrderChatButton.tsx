
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWorkOrderChatRoom, createChatRoom } from '@/services/chat';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateRoomParams } from '@/services/chat/room/types';

export interface WorkOrderChatButtonProps {
  workOrderId: string;
  workOrderName: string;
}

export const WorkOrderChatButton: React.FC<WorkOrderChatButtonProps> = ({ workOrderId, workOrderName }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenChat = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the chat feature",
          variant: "destructive",
        });
        return;
      }
      
      // Check if a work order chat already exists
      let workOrderRoom = await getWorkOrderChatRoom(workOrderId);
      
      // If no room exists, create one
      if (!workOrderRoom) {
        const roomParams: CreateRoomParams = {
          name: `Work Order: ${workOrderName}`,
          type: 'work_order',
          participants: [user.id],
          workOrderId,
          metadata: {
            work_order: {
              id: workOrderId,
              number: workOrderName,
              status: "Unknown", // Adding required status field
              customer_name: "Unknown" // Adding required customer_name field
            }
          }
        };
        
        workOrderRoom = await createChatRoom(roomParams);
        
        toast({
          title: "Chat created",
          description: "New work order chat room created",
        });
      }
      
      // Navigate to the chat room
      navigate(`/chat/${workOrderRoom.id}`);
    } catch (err) {
      console.error("Error opening work order chat:", err);
      toast({
        title: "Error",
        description: "Failed to open work order chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenChat}
            disabled={isLoading}
            className="flex items-center gap-1 hover:bg-slate-100 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isLoading ? 'Opening...' : 'Chat'}</span>
            {!isLoading && <ArrowRight className="h-3 w-3 ml-1" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open work order chat</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
