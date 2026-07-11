import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SafetyMeeting } from '@/hooks/useSafetyMeetings';
import { Calendar, Clock, MapPin, User, Users, ChevronRight, MessageSquare } from 'lucide-react';

interface MeetingCardProps {
  meeting: SafetyMeeting;
  onClick: () => void;
}

const meetingTypeLabels: Record<string, string> = {
  toolbox_talk: 'Toolbox Talk',
  safety_committee: 'Safety Committee',
  all_hands: 'All Hands',
  training: 'Training',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const isPast = new Date(meeting.meeting_date) < new Date();
  const isToday = format(new Date(meeting.meeting_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
              </Badge>
              <Badge className={statusColors[meeting.status]}>
                {meeting.status.replace('_', ' ')}
              </Badge>
              {isToday && meeting.status === 'scheduled' && (
                <Badge className="bg-primary text-primary-foreground">Today</Badge>
              )}
            </div>
            <CardTitle className="text-base">{meeting.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {format(new Date(meeting.meeting_date), 'h:mm a')}
            {meeting.duration_minutes && ` (${meeting.duration_minutes} min)`}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {meeting.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {meeting.location}
            </div>
          )}
          {meeting.facilitator_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {meeting.facilitator_name}
            </div>
          )}
        </div>

        {meeting.topics && meeting.topics.length > 0 && (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {meeting.topics.slice(0, 3).map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {meeting.topics.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{meeting.topics.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {meeting.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {meeting.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
