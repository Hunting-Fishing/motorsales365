import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Shield, Check } from 'lucide-react';
import { useSecurityEvents } from '@/hooks/useSecurityEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function SecurityEventsMonitor() {
  const { loading, events, resolveEvent } = useSecurityEvents();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Security Events</CardTitle>
        </div>
        <CardDescription>
          Monitor and respond to security incidents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <div className="text-muted-foreground">No security events</div>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${
                  event.resolved ? 'bg-muted/30 border-border' : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {event.resolved ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-semibold">{event.event_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                    {!event.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveEvent(event.id, event.user_id || '')}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {event.description}
                  </p>
                )}
                {event.resolved && event.resolved_at && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Resolved on {format(new Date(event.resolved_at), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
