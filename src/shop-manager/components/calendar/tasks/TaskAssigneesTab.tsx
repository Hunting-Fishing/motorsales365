import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TaskAssigneesTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
}

export function TaskAssigneesTab({ taskData }: TaskAssigneesTabProps) {
  const { assignees, teamMembers, assign, unassign } = taskData;
  const [selectedMember, setSelectedMember] = useState<string>('');

  const availableMembers = teamMembers.filter(
    (member) => !assignees.some((a) => a.assignee_id === member.id)
  );

  const handleAssign = () => {
    if (!selectedMember) return;
    const member = teamMembers.find((m) => m.id === selectedMember);
    if (member) {
      const name = member.first_name && member.last_name
        ? `${member.first_name} ${member.last_name}`
        : member.email || 'Unknown';
      assign({ assigneeId: member.id, assigneeName: name });
      setSelectedMember('');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Add Assignee */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} disabled={!selectedMember}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignee List */}
      <div className="space-y-2">
        {assignees.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No one assigned yet</p>
              <p className="text-sm">Add team members to this task</p>
            </CardContent>
          </Card>
        ) : (
          assignees.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(assignment.assignee_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{assignment.assignee_name || 'Unknown'}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Assigned {format(new Date(assignment.assigned_at), 'MMM d, h:mm a')}
                        </span>
                        {assignment.assigned_by_name && (
                          <span>by {assignment.assigned_by_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unassign(assignment.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
