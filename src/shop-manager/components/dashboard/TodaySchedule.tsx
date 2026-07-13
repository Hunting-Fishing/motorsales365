
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Clock, Users, Wrench } from "lucide-react";
import { getTodaySchedule, TodayScheduleItem } from "@/services/dashboard/calendarService";
import { format } from "date-fns";

export function TodaySchedule() {
  const [schedule, setSchedule] = useState<TodayScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getTodaySchedule();
        setSchedule(data);
      } catch (error) {
        console.error("Error loading today's schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return <Wrench className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventVariant = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return 'info';
      case 'meeting':
        return 'success';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="dashboard-today-schedule">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6 text-muted-foreground" aria-hidden />}
            title="No events today"
            description="You have no scheduled events for today."
            actionLink={{ label: 'Open Calendar', to: '/calendar' }}
          />
        ) : (
          <div className="space-y-3">
            {schedule.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getEventIcon(item.event_type)}
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.start_time), 'h:mm a')} - {format(new Date(item.end_time), 'h:mm a')}
                    </div>
                  </div>
                </div>
                <Badge variant={getEventVariant(item.event_type)}>
                  {item.event_type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
