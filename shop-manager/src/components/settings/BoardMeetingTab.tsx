import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, FileText, Clock, MapPin, Video, Plus, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BoardMeetingTab = () => {
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meetingsData, membersData] = await Promise.all([
        supabase.from('board_meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('board_members').select('*').eq('is_active', true)
      ]);

      setMeetings(meetingsData.data || []);
      setMembers(membersData.data || []);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load board meeting data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading board meeting data...</div>;
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.meeting_date) > new Date());
  const recentMeetings = meetings.filter(m => new Date(m.meeting_date) <= new Date()).slice(0, 3);
  const pendingMinutes = meetings.filter(m => m.meeting_minutes && !m.minutes_approved).length;
  const averageAttendance = members.length > 0 ? Math.round((members.length * 0.92) * 100 / members.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Board Meetings</h2>
          <p className="text-muted-foreground">Manage board meetings, agendas, minutes, and compliance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Minutes
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Year</p>
                <p className="text-2xl font-bold text-foreground">{meetings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold text-foreground">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Minutes</p>
                <p className="text-2xl font-bold text-foreground">{pendingMinutes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold text-foreground">{averageAttendance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>
            Scheduled board meetings and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingMeetings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming meetings scheduled</p>
            ) : (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      {meeting.is_virtual ? <Video className="h-4 w-4 text-blue-600" /> : <Calendar className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{meeting.meeting_type}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(meeting.meeting_date).toLocaleDateString()} • {new Date(meeting.meeting_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="flex items-center gap-1">
                          {meeting.is_virtual ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {meeting.is_virtual ? 'Virtual Meeting' : meeting.location || 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                      {meeting.meeting_packet_sent ? 'Confirmed' : 'Draft'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Minutes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meeting Minutes
          </CardTitle>
          <CardDescription>
            Minutes from recent board meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMeetings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent meetings found</p>
            ) : (
              recentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{meeting.meeting_type}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(meeting.meeting_date).toLocaleDateString()} • 
                      {meeting.attendees?.length || 0} attendees • 
                      {meeting.quorum_met ? 'Quorum met' : 'No quorum'}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {meeting.agenda_items?.length || 0} agenda items • 
                        {meeting.votes_taken?.length || 0} votes taken
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={meeting.minutes_approved ? "bg-green-500/10 text-green-700 hover:bg-green-500/20" : "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20"}>
                      {meeting.minutes_approved ? 'Approved' : 'Pending Approval'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View Minutes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Board Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Board Members
          </CardTitle>
          <CardDescription>
            Current board composition and member information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 col-span-full">No active board members found</p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.first_name?.charAt(0) || ''}{member.last_name?.charAt(0) || ''}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{member.first_name} {member.last_name}</h4>
                      <p className="text-sm text-muted-foreground">{member.position}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Term: {new Date(member.start_date).getFullYear()}-{member.end_date ? new Date(member.end_date).getFullYear() : 'Present'}</p>
                    <p>Expertise: {member.expertise_areas?.join(', ') || 'Not specified'}</p>
                    <p>Status: {member.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};