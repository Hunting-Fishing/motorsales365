import { useState } from 'react';
import { format, isToday, isFuture, isPast, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSafetyMeetings, SafetyMeeting } from '@/hooks/useSafetyMeetings';
import { MeetingCard } from '@/components/safety/meetings/MeetingCard';
import { CreateMeetingDialog } from '@/components/safety/meetings/CreateMeetingDialog';
import { MeetingDetailsSheet } from '@/components/safety/meetings/MeetingDetailsSheet';
import { Plus, Search, Calendar, Users, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SafetyMeetings() {
  const { meetings, isLoading } = useSafetyMeetings();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<SafetyMeeting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.topics?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || meeting.meeting_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const upcomingMeetings = filteredMeetings.filter(m => 
    m.status === 'scheduled' && (isFuture(new Date(m.meeting_date)) || isToday(new Date(m.meeting_date)))
  );
  const completedMeetings = filteredMeetings.filter(m => m.status === 'completed');
  const inProgressMeetings = filteredMeetings.filter(m => m.status === 'in_progress');

  // Stats
  const thisMonthMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.meeting_date);
    const now = new Date();
    return meetingDate.getMonth() === now.getMonth() && meetingDate.getFullYear() === now.getFullYear();
  });
  const completedThisMonth = thisMonthMeetings.filter(m => m.status === 'completed').length;
  const toolboxTalksThisMonth = thisMonthMeetings.filter(m => m.meeting_type === 'toolbox_talk').length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Safety Meetings</h1>
          <p className="text-muted-foreground">Toolbox talks, safety committees & training sessions</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthMeetings.length}</div>
            <p className="text-xs text-muted-foreground">meetings scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toolbox Talks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{toolboxTalksThisMonth}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Meeting type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="toolbox_talk">Toolbox Talk</SelectItem>
            <SelectItem value="safety_committee">Safety Committee</SelectItem>
            <SelectItem value="all_hands">All Hands</SelectItem>
            <SelectItem value="training">Training</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meeting Lists */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({upcomingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <Users className="h-4 w-4" />
            In Progress ({inProgressMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Completed ({completedMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No upcoming meetings scheduled
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          {inProgressMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No meetings in progress
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed meetings
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateMeetingDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <MeetingDetailsSheet
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
      />
    </div>
  );
}
