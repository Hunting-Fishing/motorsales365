import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageCircle, Users, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createChatRoom } from '@/services/chat';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateUniqueDisplayNames, formatDisplayName } from '@/utils/duplicateNameHandler';

interface NewChatDialogCompleteProps {
  currentUserId: string;
  onChatCreated?: (room: import('@/types/chat').ChatRoom) => void;
  trigger?: React.ReactNode;
}

interface Profile {
  id: string;
  full_name: string | null;
  first_name?: string;
  last_name?: string;
  email: string;
}

export function NewChatDialogComplete({ currentUserId, onChatCreated, trigger }: NewChatDialogCompleteProps) {
  const [open, setOpen] = useState(false);
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState<'direct' | 'group' | 'work_order'>('group');
  const [isCreating, setIsCreating] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([currentUserId]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProfiles();
      setSelectedParticipants([currentUserId]);
    }
  }, [open, currentUserId]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email')
        .neq('id', currentUserId);
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  // Filter to only show company domain emails and dedupe by email
  const filteredProfiles = useMemo(() => {
    const seen = new Set<string>();
    return profiles.filter(p => {
      // Only show wainwrightmarine.com emails
      if (!p.email.endsWith('@wainwrightmarine.com')) return false;
      // Dedupe by email
      if (seen.has(p.email)) return false;
      seen.add(p.email);
      return true;
    });
  }, [profiles]);

  // Generate unique display names to handle duplicates
  const displayNameMap = useMemo(() => {
    const membersForDisplay = filteredProfiles.map(p => ({
      id: p.id,
      first_name: p.first_name || p.full_name?.split(' ')[0],
      last_name: p.last_name || p.full_name?.split(' ').slice(1).join(' '),
      email: p.email,
    }));
    return generateUniqueDisplayNames(membersForDisplay);
  }, [filteredProfiles]);

  const getDisplayName = (profile: Profile): string => {
    const displayInfo = displayNameMap.get(profile.id);
    if (displayInfo) {
      return formatDisplayName(displayInfo);
    }
    return profile.full_name || profile.email;
  };

  const handleCreateChat = async () => {
    console.log('[NewChatDialog] Starting chat creation:', {
      chatName,
      chatType,
      participantsCount: selectedParticipants.length,
      currentUserId
    });

    if (!chatName.trim()) {
      console.warn('[NewChatDialog] Validation failed: empty chat name');
      toast({
        title: "Error",
        description: "Please enter a chat name",
        variant: "destructive",
      });
      return;
    }

    if (selectedParticipants.length === 0) {
      console.warn('[NewChatDialog] Validation failed: no participants selected');
      toast({
        title: "Error",
        description: "Please select at least one participant",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Verify authentication before attempting to create
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create a chat room",
          variant: "destructive",
        });
        return;
      }

      // Deduplicate participants and ensure current user is included
      const uniqueParticipants = Array.from(new Set([...selectedParticipants, currentUserId]));
      console.log('[NewChatDialog] Creating chat room with participants:', uniqueParticipants);
      
      const room = await createChatRoom({
        name: chatName,
        type: chatType,
        participants: uniqueParticipants,
        metadata: {}
      });

      console.log('[NewChatDialog] Chat room created successfully:', room);
      toast({
        title: "Chat Created",
        description: `${chatName} has been created successfully`,
      });

      setOpen(false);
      setChatName('');
      setSelectedParticipants([currentUserId]);
      onChatCreated?.(room);
    } catch (error: any) {
      console.error('[NewChatDialog] Error creating chat:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        chatName,
        chatType,
        participants: selectedParticipants,
        timestamp: new Date().toISOString()
      });
      
      // Map common errors to user-friendly messages
      let userMessage = error?.message || 'An unexpected error occurred';
      
      if (error?.message?.includes('Authentication required')) {
        userMessage = 'Please log in and try again';
      } else if (error?.message?.includes('session has expired')) {
        userMessage = 'Your session expired. Please refresh the page and try again';
      } else if (error?.code === '42501') {
        userMessage = 'You do not have permission to create chat rooms';
      } else if (error?.message?.includes('violates row-level security')) {
        userMessage = 'Unable to create chat room. Please check your permissions';
      }
      
      toast({
        title: "Failed to Create Chat",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getChatIcon = () => {
    switch (chatType) {
      case 'direct':
        return <MessageCircle className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'work_order':
        return <Wrench className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription>
            Start a new conversation with your team members.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="chat-type">Chat Type</Label>
            <Select value={chatType} onValueChange={(value: 'direct' | 'group' | 'work_order') => setChatType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select chat type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Direct Message
                  </div>
                </SelectItem>
                <SelectItem value="group">
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Group Chat
                  </div>
                </SelectItem>
                <SelectItem value="work_order">
                  <div className="flex items-center">
                    <Wrench className="mr-2 h-4 w-4" />
                    Work Order Chat
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="chat-name">Chat Name</Label>
            <Input
              id="chat-name"
              placeholder="Enter chat name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Select Participants</Label>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              {filteredProfiles.map(profile => (
                <div key={profile.id} className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id={profile.id}
                    checked={selectedParticipants.includes(profile.id)}
                    onCheckedChange={() => toggleParticipant(profile.id)}
                  />
                  <label
                    htmlFor={profile.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {getDisplayName(profile)}
                  </label>
                </div>
              ))}
              {filteredProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No team members found</p>
              )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleCreateChat} disabled={isCreating || !chatName.trim()}>
            {getChatIcon()}
            <span className="ml-2">
              {isCreating ? 'Creating...' : 'Create Chat'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
