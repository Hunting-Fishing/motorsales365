import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SafetyMeeting, useSafetyMeetings, useMeetingAttendees, ActionItem } from '@/hooks/useSafetyMeetings';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Check, X, Plus, Trash2, Edit2, Save, FileSignature } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';

interface MeetingDetailsSheetProps {
  meeting: SafetyMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-yellow-500/10 text-yellow-500',
  completed: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-muted text-muted-foreground',
};

export function MeetingDetailsSheet({ meeting, open, onOpenChange }: MeetingDetailsSheetProps) {
  const { updateMeeting, deleteMeeting } = useSafetyMeetings();
  const { attendees, addAttendee, updateAttendee, removeAttendee } = useMeetingAttendees(meeting?.id || null);
  const { teamMembers } = useTeamMembers();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState(meeting?.discussion_notes || '');
  const [newActionItem, setNewActionItem] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [signingAttendee, setSigningAttendee] = useState<string | null>(null);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);

  if (!meeting) return null;

  const handleStatusChange = async (status: string) => {
    await updateMeeting.mutateAsync({ id: meeting.id, status: status as SafetyMeeting['status'] });
  };

  const handleSaveNotes = async () => {
    await updateMeeting.mutateAsync({ id: meeting.id, discussion_notes: notes });
    toast.success('Notes saved');
  };

  const handleAddAttendee = async () => {
    if (!selectedEmployee) return;
    const member = teamMembers.find(m => m.id === selectedEmployee);
    if (!member) return;
    
    await addAttendee.mutateAsync({
      meeting_id: meeting.id,
      employee_id: selectedEmployee,
      employee_name: member.name,
    });
    setSelectedEmployee('');
  };

  const handleToggleAttendance = async (attendee: typeof attendees[0]) => {
    await updateAttendee.mutateAsync({
      id: attendee.id,
      attended: !attendee.attended,
    });
  };

  const handleSignAttendance = async () => {
    if (!signingAttendee || !signatureRef) return;
    const signatureData = signatureRef.toDataURL();
    await updateAttendee.mutateAsync({
      id: signingAttendee,
      attended: true,
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    });
    setSigningAttendee(null);
    toast.success('Attendance signed');
  };

  const handleAddActionItem = async () => {
    if (!newActionItem.trim()) return;
    const actionItems: ActionItem[] = [...(meeting.action_items || []), {
      id: crypto.randomUUID(),
      description: newActionItem,
      completed: false,
    }];
    await updateMeeting.mutateAsync({ id: meeting.id, action_items: actionItems });
    setNewActionItem('');
  };

  const handleToggleActionItem = async (itemId: string) => {
    const actionItems = (meeting.action_items || []).map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    await updateMeeting.mutateAsync({ id: meeting.id, action_items: actionItems });
  };

  const handleDeleteMeeting = async () => {
    await deleteMeeting.mutateAsync(meeting.id);
    onOpenChange(false);
  };

  const attendedCount = attendees.filter(a => a.attended).length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle>{meeting.title}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusColors[meeting.status]}>
                    {meeting.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{meeting.meeting_type.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Meeting Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(meeting.meeting_date), 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(meeting.meeting_date), 'h:mm a')}
              </div>
              {meeting.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {meeting.location}
                </div>
              )}
              {meeting.facilitator_name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {meeting.facilitator_name}
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="flex gap-2">
              {meeting.status === 'scheduled' && (
                <Button size="sm" onClick={() => handleStatusChange('in_progress')}>
                  Start Meeting
                </Button>
              )}
              {meeting.status === 'in_progress' && (
                <Button size="sm" onClick={() => handleStatusChange('completed')}>
                  Complete Meeting
                </Button>
              )}
              {meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('cancelled')}>
                  Cancel
                </Button>
              )}
            </div>

            <Tabs defaultValue="attendees" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="attendees">
                  Attendees ({attendedCount}/{attendees.length})
                </TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="attendees" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Add Attendee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers
                            .filter(m => !attendees.some(a => a.employee_id === m.id))
                            .map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddAttendee} disabled={!selectedEmployee}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {attendees.map(attendee => (
                    <Card key={attendee.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={attendee.attended}
                            onCheckedChange={() => handleToggleAttendance(attendee)}
                          />
                          <span className={attendee.attended ? '' : 'text-muted-foreground'}>
                            {attendee.employee_name}
                          </span>
                          {attendee.signature_data && (
                            <Badge variant="outline" className="text-xs">
                              <FileSignature className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!attendee.signature_data && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSigningAttendee(attendee.id)}
                            >
                              <FileSignature className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttendee.mutateAsync(attendee.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {attendees.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No attendees added yet
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Meeting discussion notes..."
                  rows={8}
                />
                <Button onClick={handleSaveNotes} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>

                {meeting.topics && meeting.topics.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Topics Covered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {meeting.topics.map((topic, i) => (
                          <Badge key={i} variant="secondary">{topic}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    placeholder="Add action item..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
                  />
                  <Button onClick={handleAddActionItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {(meeting.action_items || []).map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleActionItem(item.id)}
                        />
                        <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                          {item.description}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                  {(!meeting.action_items || meeting.action_items.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No action items yet
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Meeting
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Signature Dialog */}
      <AlertDialog open={!!signingAttendee} onOpenChange={() => setSigningAttendee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Attendance</AlertDialogTitle>
            <AlertDialogDescription>
              Please sign below to confirm attendance
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border rounded-md bg-background">
            <SignatureCanvas
              ref={(ref) => setSignatureRef(ref)}
              canvasProps={{
                className: 'w-full h-32',
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => signatureRef?.clear()}>Clear</Button>
            <AlertDialogAction onClick={handleSignAttendance}>Save Signature</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meeting and all attendee records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeeting} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
