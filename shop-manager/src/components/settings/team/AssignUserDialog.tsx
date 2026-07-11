import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department_id?: string;
}

interface AssignUserDialogProps {
  departmentId: string;
  departmentName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentChange: () => void;
  currentMembers: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export function AssignUserDialog({ 
  departmentId, 
  departmentName, 
  isOpen, 
  onClose, 
  onAssignmentChange,
  currentMembers 
}: AssignUserDialogProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, departmentId]);

  const fetchAvailableUsers = async () => {
    try {
      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
        
      if (!profile?.shop_id) return;

      // Fetch users not in any department or not in this department
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, job_title, department_id')
        .eq('shop_id', profile.shop_id)
        .neq('department_id', departmentId);
        
      if (error) throw error;
      
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: departmentId })
        .eq('id', selectedUserId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User assigned to department successfully."
      });
      
      onAssignmentChange();
      setSelectedUserId('');
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error assigning user:', error);
      toast({
        title: "Error",
        description: "Failed to assign user to department.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: null })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User removed from department successfully."
      });
      
      onAssignmentChange();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from department.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {departmentName} Members</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Members */}
          <div>
            <h4 className="font-medium mb-3">Current Members ({currentMembers.length})</h4>
            {currentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned to this department.</p>
            ) : (
              <div className="space-y-2">
                {currentMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {member.first_name} {member.last_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(member.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign New Member */}
          <div>
            <h4 className="font-medium mb-3">Assign New Member</h4>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.first_name} {user.last_name}</span>
                        {user.job_title && (
                          <Badge variant="secondary" className="text-xs">
                            {user.job_title}
                          </Badge>
                        )}
                        {user.department_id && (
                          <Badge variant="outline" className="text-xs">
                            Already assigned
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAssignUser}
                disabled={!selectedUserId || isLoading}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
            {availableUsers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No available users to assign.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}