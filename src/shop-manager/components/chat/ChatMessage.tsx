
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { parseFileFromMessage } from '@/services/chat/fileService';
import { ChatFileMessage } from './file/ChatFileMessage';
import { cn } from "@/lib/utils";
import { TaggedItem } from './TaggedItem';
import { parseTaggedItems } from '@/services/chat/message/types';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle, MessageSquare, Edit2, Trash2, ThumbsUp, Heart, Smile } from 'lucide-react';
import { saveMessageToRecord } from '@/services/chat/message/mutations';
import { toast } from '@/hooks/use-toast';
import { 
  addMessageReaction, 
  removeMessageReaction, 
  getMessageReactions 
} from '@/services/chat/message/reactions';
import { useEffect } from 'react';
import { markMessageAsRead } from '@/services/chat/message/readReceipts';

interface ChatMessageProps {
  message: ChatMessageType;
  isCurrentUser: boolean;
  onFlagMessage?: (messageId: string, reason: string) => void;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  userId: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isCurrentUser,
  onFlagMessage,
  onReply,
  onEdit,
  userId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [reactions, setReactions] = useState<{type: string, count: number, userReacted: boolean}[]>([]);

  // Parse the message content for file references
  const { fileInfo, text } = parseFileFromMessage(message.content);
  
  // Parse tagged items
  const taggedItems = parseTaggedItems(message.content);
  
  // Format time
  const formattedTime = formatMessageTime(message.created_at);
  
  // Check if this message has been saved already
  const isSavedToWorkOrder = message.metadata?.saved_to?.work_order ? true : false;
  const isSavedToVehicle = message.metadata?.saved_to?.vehicle ? true : false;

  // Mark message as read when it appears
  useEffect(() => {
    if (message.sender_id !== userId && !message.is_read) {
      markMessageAsRead(message.id, userId).catch(console.error);
    }
  }, [message.id, message.sender_id, message.is_read, userId]);

  // Load reactions
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const messageReactions = await getMessageReactions(message.id);
        
        // Count reactions by type
        const reactionCounts: {[key: string]: {count: number, userReacted: boolean}} = {};
        
        messageReactions.forEach(reaction => {
          if (!reactionCounts[reaction.reaction_type]) {
            reactionCounts[reaction.reaction_type] = {
              count: 0,
              userReacted: false
            };
          }
          
          reactionCounts[reaction.reaction_type].count++;
          
          if (reaction.user_id === userId) {
            reactionCounts[reaction.reaction_type].userReacted = true;
          }
        });
        
        // Convert to array for rendering
        const reactionArray = Object.entries(reactionCounts).map(([type, data]) => ({
          type,
          count: data.count,
          userReacted: data.userReacted
        }));
        
        setReactions(reactionArray);
      } catch (error) {
        console.error("Error loading reactions:", error);
      }
    };
    
    loadReactions();
  }, [message.id, userId]);
  
  // Handle saving to work order
  const handleSaveToWorkOrder = async () => {
    try {
      if (!message.metadata?.taggedItems?.workOrderIds?.length) {
        toast({
          title: "No work order tagged",
          description: "This message doesn't have a work order tag (#WO-123)",
          variant: "destructive"
        });
        return;
      }
      
      // Get the first tagged work order
      const workOrderId = message.metadata.taggedItems.workOrderIds[0];
      
      await saveMessageToRecord(message.id, 'work_order', workOrderId);
      
      toast({
        title: "Saved to work order",
        description: `Message saved to work order #${workOrderId}`,
      });
    } catch (error) {
      console.error("Error saving to work order:", error);
      toast({
        title: "Error",
        description: "Failed to save message to work order",
        variant: "destructive"
      });
    }
  };
  
  // Handle saving to vehicle history
  const handleSaveToVehicleHistory = async () => {
    try {
      // For simplicity, using the work order's vehicle if available
      // In a real app, you might want to prompt the user to select a vehicle
      if (!message.metadata?.taggedItems?.workOrderIds?.length) {
        toast({
          title: "No work order tagged",
          description: "Please tag a work order with a vehicle first",
          variant: "destructive"
        });
        return;
      }
      
      // In a real implementation, you would get the vehicle ID from the work order
      // This is a placeholder example
      const workOrderId = message.metadata.taggedItems.workOrderIds[0];
      const vehicleId = "placeholder-vehicle-id";
      
      await saveMessageToRecord(message.id, 'vehicle', vehicleId);
      
      toast({
        title: "Saved to vehicle history",
        description: "Message saved to vehicle history record",
      });
    } catch (error) {
      console.error("Error saving to vehicle history:", error);
      toast({
        title: "Error",
        description: "Failed to save message to vehicle history",
        variant: "destructive"
      });
    }
  };
  
  // Handle flagging message
  const handleFlagMessage = () => {
    if (onFlagMessage) {
      onFlagMessage(message.id, "needs_attention");
    }
  };
  
  // Handle edit message
  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };
  
  // Save edited message
  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Handle reactions
  const handleReaction = async (reactionType: string) => {
    try {
      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(r => r.type === reactionType && r.userReacted);
      
      if (existingReaction) {
        // Remove reaction
        await removeMessageReaction(message.id, userId, reactionType);
        
        // Update local state
        setReactions(prev => prev.map(r => 
          r.type === reactionType 
            ? { ...r, count: r.count - 1, userReacted: false }
            : r
        ).filter(r => r.count > 0));
      } else {
        // Add reaction
        await addMessageReaction(message.id, userId, reactionType);
        
        // Update local state
        const existingType = reactions.find(r => r.type === reactionType);
        if (existingType) {
          setReactions(prev => prev.map(r => 
            r.type === reactionType
              ? { ...r, count: r.count + 1, userReacted: true }
              : r
          ));
        } else {
          setReactions(prev => [...prev, {
            type: reactionType,
            count: 1,
            userReacted: true
          }]);
        }
      }
    } catch (error) {
      console.error("Error managing reaction:", error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className={cn(
      "flex mb-2",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%]",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        {!isCurrentUser && (
          <div className="ml-2 text-xs text-slate-500 mb-1">
            {message.sender_name}
          </div>
        )}
        
        <div className={cn(
          "rounded-2xl px-4 py-2 break-words",
          isCurrentUser 
            ? "bg-green-500 text-white" 
            : "bg-gray-200 text-gray-900"
        )}>
          {/* If it's a file message, render the appropriate component */}
          {fileInfo ? (
            <ChatFileMessage fileInfo={fileInfo} caption={text} />
          ) : (
            <div>
              {isEditing ? (
                <div className="flex flex-col space-y-2">
                  <textarea 
                    className="p-2 border border-gray-300 rounded w-full text-slate-900"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  
                  {message.is_edited && (
                    <div className="text-xs italic mt-1">
                      (edited)
                    </div>
                  )}
                </>
              )}
              
              {/* Display thread count if there are replies */}
              {message.thread_count && message.thread_count > 0 && (
                <div 
                  className="flex items-center mt-1 text-xs cursor-pointer text-blue-600 hover:underline"
                  onClick={() => onReply && onReply(message.id)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
                </div>
              )}
              
              {/* Render tagged items if there are any */}
              {(taggedItems.workOrderIds.length > 0 || 
                taggedItems.partIds.length > 0 || 
                taggedItems.warrantyIds.length > 0 || 
                taggedItems.jobIds.length > 0) && (
                <div className="mt-1 flex flex-wrap">
                  {taggedItems.workOrderIds.map(id => (
                    <TaggedItem key={`wo-${id}`} type="work-order" id={id} />
                  ))}
                  {taggedItems.partIds.map(id => (
                    <TaggedItem key={`part-${id}`} type="part" id={id} />
                  ))}
                  {taggedItems.warrantyIds.map(id => (
                    <TaggedItem key={`warranty-${id}`} type="warranty" id={id} />
                  ))}
                  {taggedItems.jobIds.map(id => (
                    <TaggedItem key={`job-${id}`} type="job" id={id} />
                  ))}
                </div>
              )}
              
              {/* Display reactions */}
              {reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {reactions.map(reaction => (
                    <Button 
                      key={reaction.type} 
                      variant={reaction.userReacted ? "secondary" : "outline"}
                      size="xs"
                      className="text-xs h-6 px-2 py-0"
                      onClick={() => handleReaction(reaction.type)}
                    >
                      {reaction.type} {reaction.count}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Show message action buttons */}
              <div className="mt-2 flex flex-wrap gap-1 justify-end">
                {/* Message actions */}
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="xs"
                    className="text-xs h-6 px-2 py-0 hover:bg-accent"
                    onClick={() => handleReaction('👍')}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="xs"
                    className="text-xs h-6 px-2 py-0 hover:bg-accent"
                    onClick={() => handleReaction('❤️')}
                  >
                    <Heart className="h-3 w-3" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="xs"
                    className="text-xs h-6 px-2 py-0 hover:bg-accent"
                    onClick={() => handleReaction('😊')}
                  >
                    <Smile className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Save actions for messages from others */}
                {!isCurrentUser && (
                  <>
                    <Button 
                      variant="ghost"
                      size="xs"
                      className="text-xs h-6 px-2 py-0 hover:bg-accent"
                      onClick={handleSaveToWorkOrder}
                      disabled={isSavedToWorkOrder}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Work Order
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      size="xs"
                      className="text-xs h-6 px-2 py-0 hover:bg-accent"
                      onClick={handleSaveToVehicleHistory}
                      disabled={isSavedToVehicle}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Vehicle
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      size="xs"
                      className="text-xs h-6 px-2 py-0 hover:bg-accent"
                      onClick={handleFlagMessage}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Flag
                    </Button>
                  </>
                )}
                
                {/* Edit/Delete for own messages */}
                {isCurrentUser && (
                  <>
                    <Button 
                      variant="ghost"
                      size="xs"
                      className="text-xs h-6 px-2 py-0 hover:bg-accent"
                      onClick={handleEdit}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      size="xs"
                      className="text-xs h-6 px-2 py-0 hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
                
                {/* Reply button for all messages */}
                <Button 
                  variant="ghost"
                  size="xs"
                  className="text-xs h-6 px-2 py-0 hover:bg-accent"
                  onClick={() => onReply && onReply(message.id)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className={cn(
          "text-xs text-slate-500 mt-1",
          isCurrentUser ? "text-right mr-1" : "ml-1"
        )}>
          {formattedTime}
          {message.is_flagged && (
            <span className="ml-2 text-amber-600">
              ⚠️ {message.flag_reason || 'Flagged'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format message time
const formatMessageTime = (timestamp: string): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // If the message is from today, just display the time
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Otherwise, show a relative time
  return formatDistanceToNow(messageDate, { addSuffix: true });
};
